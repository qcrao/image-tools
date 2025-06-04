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

    // Create style element
    const styleElement = document.createElement("style");
    styleElement.id = "image-tools-styles";
    styleElement.innerHTML = `
      .${this.TOOLS_CONTAINER_CLASS} {
        position: absolute;
        top: 8px;
        left: 8px;
        display: flex;
        gap: 4px;
        background-color: rgba(0, 0, 0, 0.5);
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
      
      /* Make tools visible on mobile devices */
      @media (max-width: 768px) {
        .${this.TOOLS_CONTAINER_CLASS} {
          opacity: 1;
        }
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
        font-size: 18px;
        line-height: 1;
        transition: all 0.2s ease;
      }
      
      .${this.TOOLS_CONTAINER_CLASS} button:hover {
        background-color: rgba(255, 255, 255, 0.2);
      }

      .${this.TOOLS_CONTAINER_CLASS} .copy-success {
        color: #4CAF50 !important;
      }
      
      /* Make images clickable for zoom */
      .roam-article img {
        cursor: pointer;
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

    // Check if mobile or desktop
    const isMobile = window.matchMedia("(max-width: 768px)").matches;

    if (isMobile) {
      // Create zoom button for mobile only
      const zoomButton = document.createElement("button");
      zoomButton.innerHTML = "👁️";
      zoomButton.title = "Zoom image";
      zoomButton.addEventListener("click", (e) => {
        e.stopPropagation();
        this.openImageInModal(img.src);
      });
      toolsContainer.appendChild(zoomButton);
    } else {
      // Create copy button for desktop only
      const copyButton = document.createElement("button");
      copyButton.innerHTML = "📋";
      copyButton.title = "Copy image";
      copyButton.addEventListener("click", (e) => {
        e.stopPropagation();
        this.copyImageToClipboard(img, copyButton);
      });
      toolsContainer.appendChild(copyButton);
    }

    // Insert tools container after the image
    parent.insertBefore(toolsContainer, img.nextSibling);
  }

  /**
   * Opens an image in a modal for zooming
   */
  private static openImageInModal(src: string): void {
    // Find the original image in the DOM
    const allImages = Array.from(
      document.querySelectorAll(".roam-article img")
    ) as HTMLImageElement[];
    const targetImage = allImages.find((img) => img.src === src);

    if (targetImage) {
      // Remove our click handler temporarily to avoid infinite loops
      const originalClickHandlers = targetImage.onclick;
      targetImage.onclick = null;

      // Create and dispatch a native mouse click event
      const clickEvent = new MouseEvent("click", {
        view: window,
        bubbles: true,
        cancelable: true,
        clientX:
          targetImage.getBoundingClientRect().left +
          targetImage.offsetWidth / 2,
        clientY:
          targetImage.getBoundingClientRect().top +
          targetImage.offsetHeight / 2,
      });

      // Dispatch the click event
      targetImage.dispatchEvent(clickEvent);

      // Restore our click handler after a short delay
      setTimeout(() => {
        targetImage.onclick = originalClickHandlers;
      }, 100);
    } else {
      // Fallback to our custom implementation if image not found
      this.showCustomZoomModal(src);
    }
  }

  /**
   * Shows custom zoom modal for when Roam's native zoom doesn't work
   */
  private static showCustomZoomModal(src: string): void {
    // Preload image to improve performance
    const preloadImage = new Image();
    preloadImage.src = src;

    // Create modal container
    const modal = document.createElement("div");
    modal.className = "image-zoom-modal";

    // Create close button
    const closeButton = document.createElement("button");
    closeButton.className = "image-zoom-close";
    closeButton.innerHTML = "×";
    closeButton.addEventListener("click", () => {
      document.body.removeChild(modal);
    });

    // Create image element
    const img = document.createElement("img");
    if (preloadImage.complete) {
      // Image already loaded, use it immediately
      img.src = src;
      modal.appendChild(img);
      modal.appendChild(closeButton);
      document.body.appendChild(modal);
    } else {
      // Show loading indicator
      modal.innerHTML =
        '<div style="color: white; font-size: 24px;">Loading image...</div>';
      document.body.appendChild(modal);

      // When image is loaded, update the modal
      preloadImage.onload = () => {
        img.src = src;
        modal.innerHTML = "";
        modal.appendChild(img);
        modal.appendChild(closeButton);
      };
    }

    // Add click handler to close modal when clicking outside the image
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    });

    // Add keyboard support for closing
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        document.body.removeChild(modal);
        document.removeEventListener("keydown", keyHandler);
      }
    };
    document.addEventListener("keydown", keyHandler);
  }

  /**
   * Shows success feedback by changing button appearance
   */
  private static showCopySuccess(button: HTMLButtonElement): void {
    // Store original state
    const originalContent = button.innerHTML;
    const originalTitle = button.title;

    // Change to success state
    button.innerHTML = "✓";
    button.title = "Copied!";
    button.classList.add("copy-success");

    // Reset after 2 seconds
    setTimeout(() => {
      button.innerHTML = originalContent;
      button.title = originalTitle;
      button.classList.remove("copy-success");
    }, 2000);
  }

  /**
   * Copies an image to the clipboard
   */
  private static copyImageToClipboard(
    img: HTMLImageElement,
    button: HTMLButtonElement
  ): void {
    try {
      // Method 1: Try to directly copy the image via Clipboard API
      fetch(img.src)
        .then((response) => response.blob())
        .then((blob) => {
          try {
            if (navigator.clipboard && window.ClipboardItem) {
              const item = new ClipboardItem({ [blob.type]: blob });
              navigator.clipboard
                .write([item])
                .then(() => {
                  console.log("Image copied successfully");
                  this.showCopySuccess(button);
                })
                .catch((err) => {
                  console.error("Clipboard API failed:", err);
                  this.fallbackCopyImage(img, button);
                });
            } else {
              this.fallbackCopyImage(img, button);
            }
          } catch (e) {
            console.error("Error using ClipboardItem:", e);
            this.fallbackCopyImage(img, button);
          }
        })
        .catch((err) => {
          console.error("Failed to fetch image:", err);
          this.fallbackCopyImage(img, button);
        });
    } catch (error) {
      console.error("Copy failed:", error);
      this.fallbackCopyImage(img, button);
    }
  }

  /**
   * Fallback method to copy an image
   */
  private static fallbackCopyImage(
    img: HTMLImageElement,
    button: HTMLButtonElement
  ): void {
    try {
      // Create a canvas element
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        throw new Error("Could not get canvas context");
      }

      // Set canvas dimensions
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;

      // Draw the image to canvas
      ctx.drawImage(img, 0, 0);

      // Try to get data URL
      try {
        // Try to copy with document.execCommand
        canvas.toBlob((blob) => {
          if (!blob) {
            throw new Error("Could not create blob");
          }

          // Create temporary element for copying
          const div = document.createElement("div");
          const tempImg = document.createElement("img");
          tempImg.src = URL.createObjectURL(blob);

          div.appendChild(tempImg);
          div.style.position = "fixed";
          div.style.pointerEvents = "none";
          div.style.opacity = "0";
          document.body.appendChild(div);

          // Select the image
          const range = document.createRange();
          range.selectNode(tempImg);
          const selection = window.getSelection();
          selection?.removeAllRanges();
          selection?.addRange(range);

          // Copy
          const successful = document.execCommand("copy");

          // Cleanup
          selection?.removeAllRanges();
          document.body.removeChild(div);
          URL.revokeObjectURL(tempImg.src);

          if (successful) {
            console.log("Copied image using execCommand");
            this.showCopySuccess(button);
          } else {
            // Last resort: copy image URL
            navigator.clipboard.writeText(img.src).then(() => {
              console.log("Copied image URL as fallback");
              this.showCopySuccess(button);
            });
          }
        });
      } catch (e) {
        console.error("Canvas or execCommand failed:", e);
        // Last resort: copy image URL
        navigator.clipboard.writeText(img.src).then(() => {
          console.log("Copied image URL as fallback");
          this.showCopySuccess(button);
        });
      }
    } catch (e) {
      console.error("All copy methods failed:", e);
      // Show success anyway to avoid confusion
      this.showCopySuccess(button);
    }
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
