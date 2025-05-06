// src/index.tsx
import { ImageToolsService } from "./services/imageToolsService";
import { loadInitialSettings, initPanelConfig } from "./settings";

// Define a type for MutationObserver if it's not recognized
declare global {
  interface Window {
    roamAlphaAPI: any;
  }
}

let imageToolsObserver: MutationObserver | null = null;

const initializeImageTools = () => {
  // Remove any previous observer
  if (imageToolsObserver) {
    imageToolsObserver.disconnect();
  }

  // Add image tools to all images on the page
  ImageToolsService.addToolsToImages();

  // Set up observer to watch for new images
  imageToolsObserver = ImageToolsService.createImageObserver();

  console.log("Image tools initialized successfully!");
};

const onload = async ({ extensionAPI }: { extensionAPI: any }) => {
  console.log("Image Tools plugin loading...");

  try {
    // Load settings
    loadInitialSettings(extensionAPI);

    // Initialize panel config
    await extensionAPI.settings.panel.create(initPanelConfig(extensionAPI));

    // Initialize custom styles
    ImageToolsService.injectCustomStyles();

    // Initialize image tools
    initializeImageTools();

    // Register Roam command to reinitialize image tools
    extensionAPI.ui.commandPalette.addCommand({
      label: "Reinitialize Image Tools",
      callback: () => initializeImageTools(),
    });

    console.log("Image Tools plugin loaded successfully!");
  } catch (error) {
    console.error("Error loading Image Tools plugin:", error);
  }
};

const onunload = () => {
  // Disconnect observer
  if (imageToolsObserver) {
    imageToolsObserver.disconnect();
    imageToolsObserver = null;
  }

  // Remove custom styles
  const styleElement = document.getElementById("image-tools-styles");
  if (styleElement) {
    styleElement.remove();
  }

  // Remove all image tools from the page
  ImageToolsService.removeAllImageTools();

  console.log("Image Tools plugin unloaded!");
};

export default {
  onload,
  onunload,
};
