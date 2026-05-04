/**
 * MapScreen POM
 *
 * Corresponding app screen: app/(app)/map.tsx
 *
 * The map uses react-native-maps / Google Maps. Interacting with the map view
 * itself is limited via Appium; we focus on verifiable UI elements surrounding
 * the map and the callout/bottom sheet that appears when a marker is tapped.
 *
 * Required testIDs:
 *   map-view            → MapView component
 *   map-loading         → ActivityIndicator while loading sensors
 *   sensor-marker       → Each map marker (custom callout View)
 *   map-callout-title   → Callout node name Text
 *   map-callout-status  → Callout status Text
 *   map-callout-close   → Callout dismiss button
 *   legend-normal       → Legend item for Normal status
 *   legend-critical     → Legend item for Critical status
 *
 * NOTE: react-native-maps markers may not be accessible via Appium
 * on all Android versions. If markers are not accessible, use coordinate-
 * based taps (see GestureHelper.tapCoordinates).
 */
import { BasePage } from './BasePage';

export class MapScreen extends BasePage {
  get mapView(): ChainablePromiseElement {
    return this.el('map-view');
  }

  get loadingIndicator(): ChainablePromiseElement {
    return this.el('map-loading');
  }

  get sensorMarkers() {
    return $$('~sensor-marker');
  }

  get calloutTitle(): ChainablePromiseElement {
    return this.el('map-callout-title');
  }

  get calloutStatus(): ChainablePromiseElement {
    return this.el('map-callout-status');
  }

  get calloutCloseButton(): ChainablePromiseElement {
    return this.el('map-callout-close');
  }

  async waitForScreen(): Promise<void> {
    await this.mapView.waitForDisplayed({ timeout: this.DEFAULT_TIMEOUT });
  }

  async waitForMarkersLoaded(): Promise<void> {
    await browser.waitUntil(
      async () => {
        try {
          const loading = await this.loadingIndicator;
          return !(await loading.isDisplayed());
        } catch {
          return true; // no loading indicator means it's done
        }
      },
      { timeout: 30000, interval: 1000, timeoutMsg: 'Map markers did not load' },
    );
  }

  async getMarkerCount(): Promise<number> {
    const markers = await this.sensorMarkers;
    return markers.length;
  }

  async tapFirstMarker(): Promise<void> {
    const markers = await this.sensorMarkers;
    if (markers.length > 0) {
      await markers[0].click();
    }
  }

  async getCalloutTitleText(): Promise<string> {
    await this.calloutTitle.waitForDisplayed({ timeout: 5000 });
    return await this.calloutTitle.getText();
  }

  async isMapVisible(): Promise<boolean> {
    try {
      return await this.mapView.isDisplayed();
    } catch {
      return false;
    }
  }
}

export const mapScreen = new MapScreen();
