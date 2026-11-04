"""Browser regressions with a mocked YouTube API; no provider requests.

Requires Python Playwright and its browsers. Starts an isolated localhost server,
including a /Odia_gita/ mount to exercise GitHub Pages relative asset paths.
"""
import argparse
import functools
import json
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
ARTIFACTS = ROOT / 'artifacts'
KEY = 'odia-gita.preferences.v1'

MOCK_API = r"""window.__ytCalls = [];
window.YT = {
  PlayerState: {UNSTARTED:-1, ENDED:0, PLAYING:1, PAUSED:2, BUFFERING:3, CUED:5},
  Player: class {
    constructor(id, options) {
      this.options=options; this.state=-1; this.video=''; this.time=0; this.volume=100;
      const host=document.getElementById(id);
      this.frame=document.createElement('iframe'); this.frame.id=id;
      this.frame.title='YouTube video player'; this.frame.src='about:blank';
      host.replaceWith(this.frame); window.__yt=this; window.__ytInstances=(window.__ytInstances||0)+1;
      setTimeout(()=>options.events.onReady({target:this}),30);
    }
    getIframe(){return this.frame;}
    emit(value){this.state=value; this.options.events.onStateChange({target:this,data:value});}
    cueVideoById(id){this.video=typeof id==='string'?id:id.videoId; window.__ytCalls.push(['cue',this.video]); this.time=0; this.emit(5);}
    loadVideoById(id){this.video=typeof id==='string'?id:id.videoId; window.__ytCalls.push(['load',this.video]); this.time=0; this.emit(1);}
    playVideo(){window.__ytCalls.push(['play',this.video]); this.emit(1);}
    pauseVideo(){window.__ytCalls.push(['pause',this.video]); this.emit(2);}
    stopVideo(){this.state=-1; window.__ytCalls.push(['stop',this.video]);}
    getPlayerState(){return this.state;}
    getVideoData(){return {video_id:this.video};}
    getVideoUrl(){return 'https://www.youtube.com/watch?v='+this.video;}
    getCurrentTime(){return this.time;}
    getDuration(){return this.video?240:0;}
    setVolume(value){this.volume=value;}
    unMute(){}
    getVolume(){return this.volume;}
    seekTo(value){this.time=value; window.__ytCalls.push(['seek',value]);}
    destroy(){const host=document.createElement('div');host.id=this.frame.id;this.frame.replaceWith(host);}
    error(code=150){this.options.events.onError({target:this,data:code});}
  }
};
window.onYouTubeIframeAPIReady?.();
"""


class Handler(SimpleHTTPRequestHandler):
    def translate_path(self, path):
        if path.startswith('/Odia_gita/'):
            path = path[len('/Odia_gita'):]
        return super().translate_path(path)

    def log_message(self, *args):
        pass


def run(browser_name, release=False):
    ARTIFACTS.mkdir(exist_ok=True)
    content_root = ROOT / 'dist' if release else ROOT
    server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Handler, directory=str(content_root)))
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    base = f'http://127.0.0.1:{server.server_port}/Odia_gita/'
    checks = []
    with sync_playwright() as playwright:
        browser = getattr(playwright, browser_name).launch(headless=True)

        def open_page(query='', storage=None, init=None, delayed=False, api_error=False):
            context = browser.new_context(viewport={'width':1440,'height':1000}, reduced_motion='reduce')
            external = []
            errors = []
            if storage is not None:
                context.add_init_script(f"localStorage.setItem({json.dumps(KEY)}, {json.dumps(storage)});")
            if init:
                context.add_init_script(init)

            def intercept(route):
                url = route.request.url
                if url.startswith(base.split('/Odia_gita')[0]):
                    return route.continue_()
                external.append(url)
                if url == 'https://www.youtube.com/iframe_api':
                    if api_error:
                        return route.abort()
                    if delayed:
                        return route.fulfill(status=200, content_type='application/javascript', body='window.__releaseYT = () => {'+MOCK_API+'};')
                    return route.fulfill(status=200, content_type='application/javascript', body=MOCK_API)
                route.abort()

            context.route('**/*', intercept)
            page = context.new_page()
            page.set_default_timeout(10000)
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.goto(base+query, wait_until='networkidle')
            expect(page.locator('.song-row')).to_have_count(20)
            return context, page, external, errors

        context, page, external, errors = open_page()
        assert not external, f'Unexpected third-party request before play: {external}'
        expect(page.locator('#trackTitleText')).to_have_text('Faguna Re Faguna')
        page.locator('#playlistSearch').fill('jhum')
        expect(page.locator('.song-row')).to_have_count(2)
        page.locator('#playlistSearch').fill('no such song 123')
        expect(page.locator('.song-row')).to_have_count(0)
        page.locator('#clearFilters').click()
        expect(page.locator('.song-row')).to_have_count(20)
        page.locator('#currentFavorite').click()
        page.locator('#filterFavorites').click()
        expect(page.locator('.song-row')).to_have_count(1)
        page.reload(wait_until='networkidle')
        page.locator('#filterFavorites').click()
        expect(page.locator('.song-row')).to_have_count(1)
        page.locator('#filterAll').click()
        page.locator('#filterRecent').click()
        expect(page.locator('.song-row')).to_have_count(0)
        page.locator('#filterAll').click()
        checks.append('Search, empty state, favorites persistence and no recent before playback')

        page.locator('#shortcutsToggle').click()
        expect(page.locator('#shortcutsDialog')).to_be_visible()
        page.keyboard.press('Escape')
        expect(page.locator('#shortcutsDialog')).not_to_be_visible()
        expect(page.locator('#shortcutsToggle')).to_be_focused()
        page.locator('#playlistSearch').focus()
        page.keyboard.type('sr ')
        expect(page.locator('#shuffleButton')).to_have_attribute('aria-pressed','false')
        page.locator('#playlistSearch').fill('')
        checks.append('Dialog focus restoration and typing does not trigger shortcuts')

        page.locator('#playButton').click()
        page.wait_for_function('window.__yt && window.__yt.state === 1')
        expect(page.locator('#availability')).to_contain_text('Playing')
        frame = page.locator('#youtubePlayer').bounding_box()
        assert frame and frame['width'] == 1 and frame['height'] == 1, frame
        page.locator('#playButton').click()
        page.wait_for_function('window.__yt.state === 2')
        expect(page.locator('#availability')).to_contain_text('Paused', ignore_case=True)
        page.locator('#volume').evaluate("el => { el.value = '37'; el.dispatchEvent(new Event('input', {bubbles:true})); }")
        page.locator('#volumeButton').click()
        assert page.evaluate('window.__yt.volume') == 0
        page.locator('#volumeButton').click()
        assert page.evaluate('window.__yt.volume') == 37
        page.locator('#playButton').click()
        page.locator('#seek').evaluate("el => { el.value = '50'; el.dispatchEvent(new Event('input', {bubbles:true})); }")
        assert page.evaluate('window.__yt.time') == 120
        page.locator('#nextButton').click()
        expect(page.locator('#trackTitleText')).to_have_text('Jhum Jhum')
        page.locator('#previousButton').click()
        expect(page.locator('#trackTitleText')).to_have_text('Faguna Re Faguna')
        page.locator('#filterRecent').click()
        assert page.locator('.song-row').count() >= 2
        page.locator('#filterAll').click()
        checks.append('Hidden YouTube player, play/pause, seek, previous/next, recent and mute restores volume')

        page.set_viewport_size({'width':390,'height':844})
        page.locator('.song-select').last.click()
        expect(page.locator('#trackTitleText')).to_have_text('Phulara Sahare Gharate Tolichi')
        page.wait_for_function("(() => { const rect = document.querySelector('#videoFrame').getBoundingClientRect(); return rect.bottom > 0 && rect.top < innerHeight; })()")
        page.locator('footer').scroll_into_view_if_needed()
        page.wait_for_timeout(150)
        expect(page.locator('#availability')).to_contain_text('Playing')
        assert page.evaluate('window.__yt.state') == 1
        page.set_viewport_size({'width':1440,'height':1000})
        checks.append('Selecting a song and scrolling does not force a pause')

        page.evaluate("""() => {
          Object.defineProperty(document, 'hidden', {configurable:true, get:() => true});
          Object.defineProperty(document, 'visibilityState', {configurable:true, get:() => 'hidden'});
          window.__pauseCount = window.__ytCalls.filter(call => call[0] === 'pause').length;
          document.dispatchEvent(new Event('visibilitychange'));
        }""")
        page.wait_for_timeout(150)
        assert page.evaluate('window.__yt.state') == 1
        page.evaluate('window.__yt.emit(1)')
        assert page.evaluate('window.__yt.state') == 1
        assert page.evaluate("window.__ytCalls.filter(call => call[0] === 'pause').length === window.__pauseCount")
        page.evaluate('window.__yt.emit(0)')
        expect(page.locator('#availability')).to_contain_text('finished',ignore_case=True)
        page.locator('#repeatButton').click()
        page.locator('#playButton').click()
        page.evaluate('window.__yt.emit(0)')
        expect(page.locator('#trackTitleText')).to_have_text('Faguna Re Faguna')
        assert page.evaluate('window.__yt.state') == 1
        page.evaluate("""() => {
          delete document.hidden;
          delete document.visibilityState;
          document.dispatchEvent(new Event('visibilitychange'));
        }""")
        page.locator('#repeatButton').click()
        page.locator('#repeatButton').click()
        checks.append('Simulated tab hiding, hidden PLAYING events and automatic queue advance do not force pauses')

        page.evaluate('window.__yt.emit(3)')
        expect(page.locator('#availability')).to_contain_text('buffer',ignore_case=True)
        page.evaluate('window.__yt.error(150)')
        expect(page.locator('#retryButton')).to_be_visible()
        expect(page.locator('#externalSources a').first).to_be_visible()
        page.locator('#retryButton').click()
        page.wait_for_function('window.__yt.state === 1')
        checks.append('Buffering, embedding failure, external fallback and recovery')

        page.evaluate("localStorage.setItem('unrelated-site-data','keep')")
        page.locator('#clearPreferences').click()
        assert page.evaluate("localStorage.getItem('unrelated-site-data')") == 'keep'
        page.locator('#filterFavorites').click()
        expect(page.locator('.song-row')).to_have_count(0)
        assert not errors, errors
        context.close()
        checks.append('Clear preferences preserves unrelated browser data')

        for query, expected in [('?song=3','Sunara Chadheyi'),('?track=jhum-jhum','Jhum Jhum')]:
            context, page, external, errors = open_page(query)
            expect(page.locator('#trackTitleText')).to_have_text(expected)
            assert not external
            page.locator('#loadPlayerButton').evaluate('element => element.click()')
            page.wait_for_function('window.__yt && window.__yt.video')
            assert page.evaluate('window.__yt.state') != 1, 'Load should cue, not autoplay'
            assert not errors, errors
            context.close()
        checks.append('Legacy and permanent links retain selection across lazy API loading without autoplay')

        context, page, external, errors = open_page('?song=2junk')
        expect(page.locator('#trackTitleText')).to_have_text('Faguna Re Faguna')
        assert not external
        context.close()

        context, page, external, errors = open_page(delayed=True)
        page.locator('#playButton').click()
        page.wait_for_function('typeof window.__releaseYT === "function"')
        page.locator('.song-select').nth(2).click()
        page.evaluate('window.__releaseYT()')
        page.wait_for_function('window.__yt && window.__yt.video === "U46qaVIN5JU"')
        expect(page.locator('#trackTitleText')).to_have_text('Sunara Chadheyi')
        assert not errors, errors
        context.close()
        checks.append('Malformed URL rejected and latest selection wins while API is loading')

        context, page, external, errors = open_page(delayed=True)
        page.locator('#playButton').click()
        page.wait_for_function('typeof window.__releaseYT === "function"')
        page.evaluate("""() => {
          Object.defineProperty(document, 'hidden', {configurable:true, get:() => true});
          Object.defineProperty(document, 'visibilityState', {configurable:true, get:() => 'hidden'});
          document.dispatchEvent(new Event('visibilitychange'));
          window.__releaseYT();
        }""")
        page.wait_for_function('window.__yt && window.__yt.state === 1')
        expect(page.locator('#availability')).to_contain_text('Playing')
        assert not errors, errors
        context.close()
        checks.append('An intentional play request survives a simulated tab switch during API loading')

        context, page, external, errors = open_page('?song=20')
        page.locator('#playButton').click()
        page.wait_for_function('window.__yt && window.__yt.state === 1')
        page.evaluate('window.__yt.emit(0)')
        expect(page.locator('#availability')).to_contain_text('finished',ignore_case=True)
        expect(page.locator('#trackTitleText')).to_have_text('Phulara Sahare Gharate Tolichi')
        page.locator('#repeatButton').click()  # Repeat all.
        page.locator('#playButton').click()
        page.wait_for_function('window.__yt.state === 1')
        page.evaluate('window.__yt.emit(0)')
        expect(page.locator('#trackTitleText')).to_have_text('Faguna Re Faguna')
        page.locator('#repeatButton').click()  # Repeat one.
        page.evaluate('window.__yt.emit(0)')
        expect(page.locator('#trackTitleText')).to_have_text('Faguna Re Faguna')
        assert page.evaluate('window.__yt.state') == 1
        page.locator('#repeatButton').click()  # Repeat off.
        page.locator('#shuffleButton').click()
        titles = [page.locator('#trackTitleText').inner_text()]
        for _ in range(3):
            page.locator('#nextButton').click()
            titles.append(page.locator('#trackTitleText').inner_text())
        assert len(set(titles)) == 4, titles
        page.locator('#previousButton').click()
        expect(page.locator('#trackTitleText')).to_have_text(titles[-2])
        page.evaluate("window.dispatchEvent(new Event('offline'))")
        expect(page.locator('#availability')).to_contain_text('offline',ignore_case=True)
        expect(page.locator('#retryButton')).to_be_visible()
        assert not errors, errors
        context.close()
        checks.append('Repeat off/all/one, nonrepeating shuffle history and offline feedback')

        context, page, external, errors = open_page(api_error=True)
        page.locator('#playButton').click()
        expect(page.locator('#retryButton')).to_be_visible()
        expect(page.locator('#availability')).to_contain_text('could not load',ignore_case=True)
        context.route('https://www.youtube.com/iframe_api',lambda route:route.fulfill(status=200,content_type='application/javascript',body=MOCK_API))
        page.locator('#retryButton').click()
        page.wait_for_function('window.__yt && window.__yt.state === 1')
        assert not errors, errors
        context.close()
        checks.append('Failed API download remains recoverable through Retry')

        context, page, external, errors = open_page(delayed=True)
        page.locator('#playButton').click()
        page.wait_for_function('typeof window.__releaseYT === "function"')
        page.evaluate("window.dispatchEvent(new Event('offline'))")
        expect(page.locator('#retryButton')).to_be_visible()
        page.locator('#retryButton').click()
        page.evaluate('window.__releaseYT()')
        page.wait_for_function('window.__yt && window.__yt.state === 1')
        assert page.evaluate('window.__ytInstances') == 1
        expect(page.locator('iframe#youtubePlayer')).to_have_count(1)
        assert not errors, errors
        context.close()
        checks.append('Offline during API load followed by Retry creates exactly one iframe')

        for label, storage, init in [
            ('corrupt','{bad json',None),
            ('blocked',None,"Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Denied','SecurityError')}})")
        ]:
            context, page, external, errors = open_page(storage=storage,init=init)
            page.locator('#currentFavorite').click()
            page.locator('#filterFavorites').click()
            expect(page.locator('.song-row')).to_have_count(1)
            expect(page.locator('#preferenceStatus')).to_contain_text('visit')
            assert not errors, errors
            context.close()
        checks.append('Corrupt and blocked storage degrade to usable temporary preferences')

        context, page, external, errors = open_page(init="Object.defineProperty(navigator,'share',{value:undefined});Object.defineProperty(navigator,'clipboard',{value:undefined});")
        page.locator('#shareButton').click()
        expect(page.locator('#manualShareDialog')).to_be_visible()
        assert '?track=faguna-re-faguna' in page.locator('#manualShareUrl').input_value()
        page.keyboard.press('Escape')
        expect(page.locator('#shareButton')).to_be_focused()
        assert not errors, errors
        context.close()
        checks.append('Manual share link available when native share and clipboard are unavailable')

        context, page, external, errors = open_page()
        for width, height in [(320,740),(390,844),(768,1024),(1440,1000),(844,390)]:
            page.set_viewport_size({'width':width,'height':height})
            page.wait_for_timeout(50)
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), f'Overflow at {width}x{height}'
            assert page.locator('#externalSources a').first.is_visible()
            frame = page.locator('#videoFrame').bounding_box()
            assert frame['width'] == 1 and frame['height'] == 1, frame
            page.screenshot(path=str(ARTIFACTS/f'{browser_name}-{width}x{height}.png'),full_page=True)
        page.set_viewport_size({'width':640,'height':900})
        page.evaluate("document.documentElement.style.fontSize='200%'")
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'Text zoom overflow'
        assert not errors, errors
        context.close()
        checks.append('Responsive layouts at five viewports, mobile fallback and 200% text size')
        browser.close()
    server.shutdown()
    result = {'browser':browser_name,'release':release,'checks':checks,'status':'passed'}
    suffix = '-release' if release else ''
    (ARTIFACTS/f'browser-{browser_name}{suffix}.json').write_text(json.dumps(result,indent=2))
    print(json.dumps(result,indent=2))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--browser',choices=['chromium','firefox','webkit'],default='chromium')
    parser.add_argument('--release',action='store_true',help='Test the built dist/ release instead of source files')
    args = parser.parse_args()
    run(args.browser,args.release)
