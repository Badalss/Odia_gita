"""Audio-only Spotify regressions: provider events are mocked, no songs downloaded."""
import argparse
import functools
import json
import subprocess
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
ARTIFACTS = ROOT / 'artifacts'
KEY = 'odia-gita.preferences.v1'
API_URL = 'https://open.spotify.com/embed/iframe-api/v1'
MOCK_API = r"""
window.__spotifyCalls=[]; window.__spotifyInstances=0;
const mockAPI={createController(host, options, callback){
  const handlers={};
  const iframe=document.createElement('iframe');
  iframe.title='Spotify audio player';iframe.src='about:blank';iframe.height='80';iframe.width='100%';
  host.replaceWith(iframe);
  const controller={
    uri:options.uri, paused:true, position:0, duration:240000, destroyed:false,
    addListener(name,callback){(handlers[name]||=[]).push(callback);},
    removeListener(name,callback){handlers[name]=(handlers[name]||[]).filter(fn=>fn!==callback);},
    emit(name,data){for(const callback of handlers[name]||[])callback({data});},
    update(){this.emit('playback_update',{playingURI:this.uri,isPaused:this.paused,isBuffering:false,duration:this.duration,position:this.position});},
    play(){window.__spotifyCalls.push(['play',this.uri]);this.paused=false;this.emit('playback_started',{playingURI:this.uri});this.update();},
    pause(){window.__spotifyCalls.push(['pause',this.uri]);this.paused=true;this.update();},
    resume(){this.play();},togglePlay(){this.paused?this.play():this.pause();},
    loadEntity(uri){this.uri=uri;this.position=0;this.paused=true;window.__spotifyCalls.push(['load',uri]);this.update();},
    loadUri(uri){this.loadEntity(uri);},
    seek(seconds){this.position=seconds*1000;this.update();},
    destroy(){this.destroyed=true;iframe.remove();window.__spotifyCalls.push(['destroy',this.uri]);}
  };
  window.__spotify=controller;window.__spotifyInstances++;
  callback(controller);
  setTimeout(()=>controller.emit('ready',{}),30);
}};
window.onSpotifyIframeApiReady(mockAPI);
"""

class Handler(SimpleHTTPRequestHandler):
    def translate_path(self,path):
        if path.startswith('/Odia_gita/'):
            path=path[len('/Odia_gita'):]
        return super().translate_path(path)
    def log_message(self,*args): pass


def run(browser_name,release=False):
    ARTIFACTS.mkdir(exist_ok=True)
    catalog=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import {tracks} from './catalog.js';console.log(JSON.stringify(tracks));"],cwd=ROOT,text=True,encoding='utf-8'))
    matched=[track for track in catalog if track['spotifyId']]
    unmatched=next((track for track in catalog if not track['spotifyId']),None)
    assert len(matched)>=2
    first,second=matched[:2]
    content_root=ROOT/'dist' if release else ROOT
    server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(content_root)))
    threading.Thread(target=server.serve_forever,daemon=True).start()
    base=f'http://127.0.0.1:{server.server_port}/Odia_gita/'
    checks=[]
    with sync_playwright() as p:
        browser=getattr(p,browser_name).launch(headless=True)
        def open_page(query='',storage=None,init=None,delayed=False,api_error=False):
            context=browser.new_context(viewport={'width':1440,'height':1000},reduced_motion='reduce')
            external=[];errors=[]
            if storage is not None:
                context.add_init_script(f'localStorage.setItem({json.dumps(KEY)},{json.dumps(storage)});')
            if init:context.add_init_script(init)
            def intercept(route):
                url=route.request.url
                if url.startswith(base.split('/Odia_gita')[0]):return route.continue_()
                external.append(url)
                if url==API_URL:
                    if api_error:return route.abort()
                    body='window.__releaseSpotify=()=>{'+MOCK_API+'};' if delayed else MOCK_API
                    return route.fulfill(status=200,content_type='application/javascript',body=body)
                route.abort()
            context.route('**/*',intercept)
            page=context.new_page();page.set_default_timeout(10000)
            page.on('pageerror',lambda error:errors.append(str(error)))
            page.goto(base+query,wait_until='networkidle')
            expect(page.locator('.song-row')).to_have_count(20)
            assert page.locator('video,#videoFrame,#youtubePlayer').count()==0
            return context,page,external,errors

        context,page,external,errors=open_page()
        assert not external,external
        page.locator('#playlistSearch').fill('jhum')
        expect(page.locator('.song-row')).to_have_count(2)
        page.locator('#playlistSearch').fill('not a real song 123')
        expect(page.locator('.song-row')).to_have_count(0)
        page.locator('#clearFilters').click()
        page.locator('#currentFavorite').click();page.locator('#filterFavorites').click()
        expect(page.locator('.song-row')).to_have_count(1)
        page.reload(wait_until='networkidle');page.locator('#filterFavorites').click()
        expect(page.locator('.song-row')).to_have_count(1)
        page.locator('#filterRecent').click();expect(page.locator('.song-row')).to_have_count(0)
        page.locator('#filterAll').click()
        checks.append('No video or third-party requests initially; search/favorites persistence and honest recent state')
        page.locator('#shortcutsToggle').click();expect(page.locator('#shortcutsDialog')).to_be_visible()
        page.keyboard.press('Escape');expect(page.locator('#shortcutsToggle')).to_be_focused()
        page.locator('#playlistSearch').focus();page.keyboard.type('s ')
        expect(page.locator('#shuffleButton')).to_have_attribute('aria-pressed','false')
        page.locator('#playlistSearch').fill('')
        checks.append('Keyboard help restores focus and typing does not trigger shortcuts')
        page.locator('#playButton').click()
        page.wait_for_function('window.__spotify && !window.__spotify.paused')
        expect(page.locator('#availability')).to_contain_text('Playing',ignore_case=True)
        frame=page.locator('#audioPlayerFrame iframe').bounding_box()
        assert frame and frame['width']>=280 and frame['height']==80,frame
        page.locator('#playButton').click();assert page.evaluate('window.__spotify.paused')
        page.locator('#playButton').click();assert not page.evaluate('window.__spotify.paused')
        page.locator('#nextButton').click();expect(page.locator('#trackTitleText')).to_have_text(second['title'])
        page.wait_for_function('window.__spotify && !window.__spotify.paused')
        page.locator('#previousButton').click();expect(page.locator('#trackTitleText')).to_have_text(first['title'])
        page.wait_for_function('window.__spotify && !window.__spotify.paused')
        page.locator('#filterRecent').click();assert page.locator('.song-row').count()>=2
        page.locator('#filterAll').click()
        checks.append('Compact 80px audio player, play/pause, next/previous and actual playback history')
        page.locator('footer').scroll_into_view_if_needed()
        page.evaluate("Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));")
        assert not page.evaluate('window.__spotify.paused')
        page.evaluate('delete document.hidden')
        checks.append('Scrolling and tab visibility signals do not force pauses')
        if unmatched:
            page.locator(f'.song-select[data-track="{unmatched["id"]}"]').click()
            expect(page.locator('#playButton')).to_be_disabled()
            expect(page.locator('#audioPlayerFrame iframe')).to_have_count(0)
            expect(page.locator('#externalSources a').last).to_be_visible()
            assert page.evaluate("window.__spotifyCalls.some(call=>call[0]==='pause'||call[0]==='destroy')")
            checks.append('Unmatched song never keeps a previous song playing or claims a playable source')
        page.evaluate("localStorage.setItem('unrelated','keep')")
        page.locator('#clearPreferences').click();assert page.evaluate("localStorage.getItem('unrelated')")=='keep'
        page.locator('#filterFavorites').click();expect(page.locator('.song-row')).to_have_count(0)
        assert not errors,errors
        context.close()
        checks.append('Clear preferences only resets this application')

        for query,title in [('?song=2',catalog[1]['title']),('?track='+first['id'],first['title'])]:
            context,page,external,errors=open_page(query)
            expect(page.locator('#trackTitleText')).to_have_text(title);assert not external
            if query=='?track='+first['id']:
                page.locator('#loadAudioButton').click()
                page.wait_for_function('window.__spotify')
                assert page.evaluate('window.__spotify.paused')
                assert not page.evaluate("window.__spotifyCalls.some(call=>call[0]==='play')")
            assert not errors,errors
            context.close()
        checks.append('Legacy/permanent links and loading the player without autoplay')
        context,page,external,errors=open_page('?song=2junk')
        expect(page.locator('#trackTitleText')).to_have_text(first['title']);assert not external
        context.close()
        context,page,external,errors=open_page(delayed=True)
        page.locator('#playButton').click();page.wait_for_function('typeof window.__releaseSpotify === "function"')
        page.locator(f'.song-select[data-track="{second["id"]}"]').click()
        page.evaluate("Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));window.__releaseSpotify();")
        page.wait_for_function('window.__spotify && !window.__spotify.paused')
        assert page.evaluate('window.__spotify.uri')=='spotify:track:'+second['spotifyId']
        expect(page.locator('#trackTitleText')).to_have_text(second['title'])
        assert not errors,errors
        context.close()
        checks.append('Strict URLs and latest selection wins delayed API initialization even after tab switch')
        context,page,external,errors=open_page(api_error=True)
        page.locator('#playButton').click();expect(page.locator('#retryButton')).to_be_visible()
        context.route(API_URL,lambda route:route.fulfill(status=200,content_type='application/javascript',body=MOCK_API))
        page.locator('#retryButton').click();page.wait_for_function('window.__spotify && !window.__spotify.paused')
        assert not errors,errors
        context.close()
        checks.append('API download failure recovers through retry and retains listening links')
        for storage,init in [('{bad',None),(None,"Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Denied','SecurityError')}})")]:
            context,page,external,errors=open_page(storage=storage,init=init)
            page.locator('#currentFavorite').click();page.locator('#filterFavorites').click()
            expect(page.locator('.song-row')).to_have_count(1)
            expect(page.locator('#preferenceStatus')).to_contain_text('visit')
            assert not errors,errors
            context.close()
        checks.append('Blocked/corrupt storage leaves favorites usable for the visit')
        context,page,external,errors=open_page(init="Object.defineProperty(navigator,'share',{value:undefined});Object.defineProperty(navigator,'clipboard',{value:undefined});")
        page.locator('#shareButton').click();expect(page.locator('#manualShareDialog')).to_be_visible()
        assert '?track='+first['id'] in page.locator('#manualShareUrl').input_value()
        page.keyboard.press('Escape');expect(page.locator('#shareButton')).to_be_focused()
        assert not errors,errors
        context.close()
        checks.append('Manual sharing fallback restores focus')
        context,page,external,errors=open_page()
        page.locator('#loadAudioButton').click();page.wait_for_function('window.__spotify')
        for width,height in [(320,740),(390,844),(768,1024),(1440,1000),(844,390)]:
            page.set_viewport_size({'width':width,'height':height});page.wait_for_timeout(50)
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),f'Overflow at {width}x{height}'
            frame=page.locator('#audioPlayerFrame iframe').bounding_box()
            assert frame and frame['width']>=280 and frame['height']==80,frame
            page.screenshot(path=str(ARTIFACTS/f'audio-{browser_name}-{width}x{height}.png'),full_page=True)
        page.set_viewport_size({'width':640,'height':900});page.evaluate("document.documentElement.style.fontSize='200%'")
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
        assert not errors,errors
        assert all('youtube' not in url.lower() for url in external),external
        context.close();browser.close()
        checks.append('Five responsive viewports and enlarged text; no YouTube/video requests')
    server.shutdown()
    result={'browser':browser_name,'release':release,'status':'passed','groups':len(checks),'checks':checks}
    suffix='-release' if release else ''
    (ARTIFACTS/f'audio-browser-{browser_name}{suffix}.json').write_text(json.dumps(result,indent=2))
    print(json.dumps(result,indent=2))

if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--browser',choices=['chromium','firefox','webkit'],default='chromium')
    parser.add_argument('--release',action='store_true')
    args=parser.parse_args();run(args.browser,args.release)
