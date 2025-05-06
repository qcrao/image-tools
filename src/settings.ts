// Default settings
const DEFAULT_ICON_SIZE = "medium";
const DEFAULT_ICON_OPACITY = "50";

// Settings variables
export let iconSize = DEFAULT_ICON_SIZE;
export let iconOpacity = DEFAULT_ICON_OPACITY;

/**
 * Load initial settings from Roam API
 */
export function loadInitialSettings(extensionAPI: any) {
  const savedIconSize = extensionAPI.settings.get("icon-size");
  iconSize = savedIconSize || DEFAULT_ICON_SIZE;

  const savedIconOpacity = extensionAPI.settings.get("icon-opacity");
  iconOpacity = savedIconOpacity || DEFAULT_ICON_OPACITY;
}

/**
 * Initialize settings panel configuration
 */
export function initPanelConfig(extensionAPI: any) {
  return {
    tabTitle: "Image Tools",
    settings: [
      {
        id: "icon-size",
        name: "Icon Size",
        description: "Size of image tool icons",
        action: {
          type: "select",
          items: ["small", "medium", "large"],
          onChange: (evt: any) => {
            if (!evt?.target?.value) return;

            iconSize = evt.target.value;

            Promise.resolve(
              extensionAPI.settings.set("icon-size", iconSize)
            ).then(() => {
              window.dispatchEvent(
                new CustomEvent("imageTools:settings:changed")
              );
            });
          },
        },
      },
      {
        id: "icon-opacity",
        name: "Icon Opacity",
        description: "Opacity of image tool icons (0-100)",
        action: {
          type: "input",
          onChange: (evt: any) => {
            if (!evt?.target?.value) return;

            const value = parseInt(evt.target.value);
            iconOpacity = isNaN(value)
              ? DEFAULT_ICON_OPACITY
              : Math.min(Math.max(value, 0), 100).toString();

            Promise.resolve(
              extensionAPI.settings.set("icon-opacity", iconOpacity)
            ).then(() => {
              window.dispatchEvent(
                new CustomEvent("imageTools:settings:changed")
              );
            });
          },
        },
      },
    ],
  };
}
