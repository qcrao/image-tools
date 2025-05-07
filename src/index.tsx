// src/index.tsx
import { ImageToolsService } from "./services/imageToolsService";

// Define a type for MutationObserver if it's not recognized
declare global {
  interface Window {
    roamAlphaAPI: any;
  }
}

let imageToolsObserver: MutationObserver | null = null;

/**
 * Checks if the current environment is running on a mobile device
 */
const isMobileDevice = (): boolean => {
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
};

const initializeImageTools = () => {
  // Remove any previous observer
  if (imageToolsObserver) {
    imageToolsObserver.disconnect();
  }

  // Add image tools to all images on the page
  ImageToolsService.addToolsToImages();

  // Set up observer to watch for new images
  imageToolsObserver = ImageToolsService.createImageObserver();

  // Log details about the current environment
  const isMobile = isMobileDevice();
  console.log(`Image tools initialized successfully! Mobile device: ${isMobile}`);
};

const onload = async ({ extensionAPI }: { extensionAPI: any }) => {
  console.log("Image Tools plugin loading...");

  try {
    // Initialize custom styles
    ImageToolsService.injectCustomStyles();

    // Initialize image tools
    initializeImageTools();

    // Register Roam command to reinitialize image tools
    extensionAPI.ui.commandPalette.addCommand({
      label: "Reinitialize Image Tools",
      callback: () => initializeImageTools(),
    });

    // Special handling for mobile devices - reinitialize after short delay
    // to ensure all images are captured after mobile app loads
    if (isMobileDevice()) {
      // Initial delay for immediate load
      setTimeout(() => {
        console.log("Mobile detected - running first reinitialization");
        initializeImageTools();
        
        // Second delay for when page is fully loaded
        setTimeout(() => {
          console.log("Mobile detected - running second reinitialization");
          initializeImageTools();
        }, 2000);
      }, 500);
    }

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
