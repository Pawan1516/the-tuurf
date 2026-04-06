from playwright.sync_api import sync_playwright
import sys

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        # Capture console logs
        page.on("console", lambda msg: print(f"BROWSER_LOG: {msg.type}: {msg.text}"))
        page.on("pageerror", lambda err: print(f"BROWSER_ERROR: {err}"))

        try:
            print("Navigating to http://localhost:3001...")
            page.goto("http://localhost:3001", wait_until="networkidle")
            
            # Take a screenshot to see the "white screen"
            page.screenshot(path="artifacts/debug_screenshot.png", full_page=True)
            print("Screenshot saved to artifacts/debug_screenshot.png")
            
            # Print page title and some content
            print(f"Page Title: {page.title()}")
            
            # Check for specific elements
            about_section = page.locator("#about")
            if about_section.is_visible():
                print("SUCCESS: #about section is visible")
            else:
                print("FAILURE: #about section NOT found")
                
        except Exception as e:
            print(f"FAILED to navigate: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    run()
