import { iconSize, iconOpacity } from "../settings";

/**
 * Service for adding interactive tools to images in Roam Research
 */
export class ImageToolsService {
  /**
   * Class name for the image tools container
   */
  private static readonly TOOLS_CONTAINER_CLASS = "roam-image-tools";

  /**
   * Adds custom styles to the page
   */
  public static injectCustomStyles(): void {
    // Remove existing styles if present
    const existingStyles = document.getElementById("image-tools-styles");
    if (existingStyles) {
      existingStyles.remove();
    }

    // Get icon size in pixels
    const iconSizeInPx = this.getIconSizeInPx();

    // Get opacity in decimal
    const opacityInDecimal = parseInt(iconOpacity) / 100;

    // Create style element
    const styleElement = document.createElement("style");
    styleElement.id = "image-tools-styles";
    styleElement.innerHTML = `
      .${this.TOOLS_CONTAINER_CLASS} {
        position: absolute;
        top: 8px;
        left: 8px;
        display: flex;
        gap: ${iconSizeInPx / 4}px;
        background-color: rgba(0, 0, 0, ${opacityInDecimal});
        border-radius: 4px;
        padding: 4px 8px;
        opacity: 0;
        transition: opacity 0.2s ease-in-out;
        z-index: 100;
      }
      
      .roam-article img:hover + .${this.TOOLS_CONTAINER_CLASS},
      .${this.TOOLS_CONTAINER_CLASS}:hover {
        opacity: 1;
      }
      
      .${this.TOOLS_CONTAINER_CLASS} button {
        background: none;
        border: none;
        color: white;
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: ${iconSizeInPx}px;
        line-height: 1;
      }
      
      .${this.TOOLS_CONTAINER_CLASS} button:hover {
        background-color: rgba(255, 255, 255, 0.2);
      }
      
      .image-zoom-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
      }
      
      .image-zoom-modal img {
        max-width: 90%;
        max-height: 90%;
        object-fit: contain;
      }
      
      .image-zoom-close {
        position: absolute;
        top: 20px;
        right: 20px;
        color: white;
        font-size: 30px;
        cursor: pointer;
        background: none;
        border: none;
      }
    `;
    document.head.appendChild(styleElement);

    // Add settings change listener
    window.addEventListener("imageTools:settings:changed", () => {
      this.injectCustomStyles();
    });
  }

  /**
   * Convert icon size string to pixels
   */
  private static getIconSizeInPx(): number {
    switch (iconSize) {
      case "small":
        return 14;
      case "large":
        return 22;
      case "medium":
      default:
        return 18;
    }
  }

  /**
   * Creates an observer that watches for new images being added to the page
   */
  public static createImageObserver(): MutationObserver {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "childList") {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as HTMLElement;

              // Check for images directly added
              const addedImages =
                element.tagName === "IMG"
                  ? [element]
                  : Array.from(element.querySelectorAll("img"));

              addedImages.forEach((img) => {
                // Only add tools if they don't already exist
                if (
                  !img.nextElementSibling?.classList.contains(
                    this.TOOLS_CONTAINER_CLASS
                  )
                ) {
                  this.addToolsToImage(img as HTMLImageElement);
                }
              });
            }
          });
        }
      });
    });

    // Start observing the document with the configured parameters
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return observer;
  }

  /**
   * Adds image tools to all images on the page
   */
  public static addToolsToImages(): void {
    const images = document.querySelectorAll(".roam-article img");
    images.forEach((img) => {
      this.addToolsToImage(img as HTMLImageElement);
    });
  }

  /**
   * Adds image tools to a specific image
   */
  private static addToolsToImage(img: HTMLImageElement): void {
    // Skip if the image already has tools
    if (
      img.nextElementSibling?.classList.contains(this.TOOLS_CONTAINER_CLASS)
    ) {
      return;
    }

    // Set crossOrigin to anonymous to help prevent tainted canvas issues
    // Note: This only works for images that support CORS
    try {
      img.crossOrigin = "anonymous";
    } catch (e) {
      console.log("Could not set crossOrigin attribute", e);
    }

    // Create wrapper if necessary
    const parent = img.parentElement;
    if (!parent) return;

    // Ensure the parent has position relative for absolute positioning of tools
    if (getComputedStyle(parent).position === "static") {
      parent.style.position = "relative";
    }

    // Create tools container
    const toolsContainer = document.createElement("div");
    toolsContainer.className = this.TOOLS_CONTAINER_CLASS;

    // Create zoom button
    const zoomButton = this.createToolButton("👁️", "Zoom image", () => {
      this.openImageInModal(img.src);
    });

    // Create copy button
    const copyButton = this.createToolButton("📋", "Copy image", () => {
      this.copyImageToClipboard(img);
    });

    // Create save button
    const saveButton = this.createToolButton("💾", "Save image", () => {
      this.saveImage(img);
    });

    // Add buttons to container
    toolsContainer.appendChild(zoomButton);
    toolsContainer.appendChild(copyButton);
    toolsContainer.appendChild(saveButton);

    // Insert tools container after the image
    parent.insertBefore(toolsContainer, img.nextSibling);
  }

  /**
   * Creates a tool button with the specified icon and click handler
   */
  private static createToolButton(
    icon: string,
    title: string,
    onClick: () => void
  ): HTMLButtonElement {
    const button = document.createElement("button");
    button.innerHTML = icon;
    button.title = title;
    button.addEventListener("click", (e) => {
      e.stopPropagation();
      onClick();
    });
    return button;
  }

  /**
   * Opens an image in a modal for zooming
   */
  private static openImageInModal(src: string): void {
    // Create modal container
    const modal = document.createElement("div");
    modal.className = "image-zoom-modal";

    // Create image element
    const img = document.createElement("img");
    img.src = src;

    // Create close button
    const closeButton = document.createElement("button");
    closeButton.className = "image-zoom-close";
    closeButton.innerHTML = "×";
    closeButton.addEventListener("click", () => {
      document.body.removeChild(modal);
    });

    // Add click handler to close modal when clicking outside the image
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    });

    // Add elements to modal and modal to body
    modal.appendChild(img);
    modal.appendChild(closeButton);
    document.body.appendChild(modal);
  }

  /**
   * Copies an image to the clipboard
   */
  private static copyImageToClipboard(img: HTMLImageElement): void {
    try {
      // Method 1: Try using a fetch to get the image data and copy it directly (best approach)
      fetch(img.src, { mode: "cors" })
        .then((response) => response.blob())
        .then((blob) => {
          // Copy the blob to clipboard (this will work in most modern browsers)
          try {
            const item = new ClipboardItem({ [blob.type]: blob });
            navigator.clipboard
              .write([item])
              .then(() => {
                console.log(
                  "Image copied to clipboard successfully using ClipboardItem"
                );
              })
              .catch((err) => {
                console.log(
                  "ClipboardItem failed, trying fallback method",
                  err
                );
                this.fallbackCopyImage(img);
              });
          } catch (e) {
            console.log(
              "ClipboardItem not supported, trying fallback method",
              e
            );
            this.fallbackCopyImage(img);
          }
        })
        .catch((err) => {
          console.error("Failed to fetch image data", err);
          this.fallbackCopyImage(img);
        });
    } catch (error) {
      console.error("Failed to copy image:", error);
      this.fallbackCopyImage(img);
    }
  }

  /**
   * Fallback method to copy an image via context menu
   */
  private static fallbackCopyImage(img: HTMLImageElement): void {
    // Simulate right click on image
    const mouseEvent = new MouseEvent("contextmenu", {
      bubbles: true,
      cancelable: true,
      view: window,
      button: 2,
      buttons: 2,
    });

    // Store the original image
    const originalOnContextMenu = img.oncontextmenu;

    // Override the context menu handler temporarily
    img.oncontextmenu = (e) => {
      e.preventDefault();
      e.stopPropagation();

      // Try to find and click "Copy Image" in context menu
      setTimeout(() => {
        const menuItems = Array.from(
          document.querySelectorAll('div[role="menuitem"]')
        );
        const copyImageMenuItem = menuItems.find(
          (item) =>
            item.textContent?.includes("Copy Image") ||
            item.textContent?.includes("Copy image")
        );

        if (copyImageMenuItem) {
          (copyImageMenuItem as HTMLElement).click();
          console.log("Copy image menu item clicked");
        } else {
          // If we can't find the menu item, at least copy the URL
          navigator.clipboard
            .writeText(img.src)
            .then(() => console.log("Image URL copied to clipboard"));
        }
      }, 10);

      // Restore original handler
      setTimeout(() => {
        img.oncontextmenu = originalOnContextMenu;
      }, 100);
    };

    // Trigger the context menu
    img.dispatchEvent(mouseEvent);
  }

  /**
   * Saves an image to the device
   */
  private static saveImage(img: HTMLImageElement): void {
    try {
      // Create a canvas to handle potential CORS issues
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      // Set canvas dimensions to match the image
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;

      // Draw the image onto the canvas
      if (ctx) {
        ctx.drawImage(img, 0, 0);

        // Try to get the image name from the src URL
        let filename = "roam-image-" + new Date().getTime() + ".png";
        try {
          // Extract filename from URL if possible
          const urlParts = img.src.split("/");
          const possibleFilename = urlParts[urlParts.length - 1].split("?")[0];
          if (
            possibleFilename &&
            possibleFilename.length > 0 &&
            possibleFilename.indexOf(".") !== -1
          ) {
            filename = possibleFilename;
          }
        } catch (e) {
          console.log("Could not extract filename from URL", e);
        }

        // Try multiple methods to ensure download works

        // Method 1: Most direct method using a data URL
        try {
          // Convert canvas to data URL
          let dataUrl = canvas.toDataURL("image/png");

          // Create download link
          const link = document.createElement("a");
          link.href = dataUrl;
          link.download = filename;
          link.style.display = "none";
          document.body.appendChild(link);
          link.click();

          // Clean up
          setTimeout(() => {
            URL.revokeObjectURL(dataUrl);
            document.body.removeChild(link);
          }, 100);

          console.log("Image downloaded using data URL method");
          return;
        } catch (e) {
          console.log("Data URL download failed, trying blob method", e);
        }

        // Method 2: Using Blob
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = filename;
            link.style.display = "none";
            document.body.appendChild(link);
            link.click();

            // Clean up
            setTimeout(() => {
              URL.revokeObjectURL(url);
              document.body.removeChild(link);
            }, 100);

            console.log("Image downloaded using blob method");
          } else {
            console.error("Failed to create blob from canvas");
            this.fallbackSaveImage(img);
          }
        });
      } else {
        console.error("Failed to get canvas context");
        this.fallbackSaveImage(img);
      }
    } catch (error) {
      console.error("Failed to save image:", error);
      this.fallbackSaveImage(img);
    }
  }

  /**
   * Fallback method to save an image
   */
  private static fallbackSaveImage(img: HTMLImageElement): void {
    try {
      // Fallback Method 1: Direct download using original image source
      const link = document.createElement("a");
      link.href = img.src;

      // Try to extract filename from URL
      let filename = "roam-image-" + new Date().getTime() + ".png";
      try {
        const urlParts = img.src.split("/");
        const possibleFilename = urlParts[urlParts.length - 1].split("?")[0];
        if (
          possibleFilename &&
          possibleFilename.length > 0 &&
          possibleFilename.indexOf(".") !== -1
        ) {
          filename = possibleFilename;
        }
      } catch (e) {
        console.log("Could not extract filename from URL", e);
      }

      link.download = filename;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();

      // Clean up
      setTimeout(() => {
        document.body.removeChild(link);
      }, 100);

      console.log("Image downloaded using direct source method");
    } catch (e) {
      console.error("All download methods failed", e);

      // Last resort: Simulate right-click and save
      this.rightClickSaveImage(img);
    }
  }

  /**
   * Last resort method to save an image via context menu
   */
  private static rightClickSaveImage(img: HTMLImageElement): void {
    // Simulate right click on image
    const mouseEvent = new MouseEvent("contextmenu", {
      bubbles: true,
      cancelable: true,
      view: window,
      button: 2,
      buttons: 2,
    });

    // Store the original image
    const originalOnContextMenu = img.oncontextmenu;

    // Override the context menu handler temporarily
    img.oncontextmenu = (e) => {
      e.preventDefault();
      e.stopPropagation();

      // Try to find and click "Save Image" in context menu
      setTimeout(() => {
        const menuItems = Array.from(
          document.querySelectorAll('div[role="menuitem"]')
        );
        const saveImageMenuItem = menuItems.find(
          (item) =>
            item.textContent?.includes("Save Image") ||
            item.textContent?.includes("Save image")
        );

        if (saveImageMenuItem) {
          (saveImageMenuItem as HTMLElement).click();
          console.log("Save image menu item clicked");
        } else {
          console.error("Could not find Save Image menu item");
        }
      }, 10);

      // Restore original handler
      setTimeout(() => {
        img.oncontextmenu = originalOnContextMenu;
      }, 100);
    };

    // Trigger the context menu
    img.dispatchEvent(mouseEvent);
  }

  /**
   * Removes all image tools from the page
   */
  public static removeAllImageTools(): void {
    const toolsElements = document.querySelectorAll(
      `.${this.TOOLS_CONTAINER_CLASS}`
    );
    toolsElements.forEach((element) => {
      element.remove();
    });
  }
}
