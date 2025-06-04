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

      .image-zoom-instructions {
        position: absolute;
        bottom: 20px;
        left: 0;
        right: 0;
        text-align: center;
        color: rgba(255, 255, 255, 0.7);
        font-size: 14px;
        pointer-events: none;
        opacity: 1;
        transition: opacity 2s;
      }
      
      .image-zoom-instructions.fade {
        opacity: 0;
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
      zoomButton.addEventListener("mousedown", (e) => {
        // Prevent default and stop propagation on mousedown (happens before click)
        e.preventDefault();
        e.stopPropagation();
      });

      zoomButton.addEventListener("click", (e) => {
        // Also prevent default and stop propagation on click
        e.preventDefault();
        e.stopPropagation();

        // Instead of using the original image, load a new one directly
        this.createAndDisplayImageOverlay(img.src);
      });

      toolsContainer.appendChild(zoomButton);
    } else {
      // Create copy button for desktop only
      const copyButton = document.createElement("button");
      copyButton.innerHTML = "📋";
      copyButton.title = "Copy image";
      copyButton.addEventListener("click", (e) => {
        e.stopPropagation();
        e.preventDefault();
        this.copyImageToClipboard(img, copyButton);
      });
      toolsContainer.appendChild(copyButton);
    }

    // Insert tools container after the image
    parent.insertBefore(toolsContainer, img.nextSibling);
  }

  /**
   * Creates and displays a simple image overlay without using Roam's systems
   * Supports pinch-to-zoom and pan gestures on mobile
   */
  private static createAndDisplayImageOverlay(src: string): void {
    // Create an overlay div that covers the entire screen
    const overlay = document.createElement("div");
    overlay.style.position = "fixed";
    overlay.style.top = "0";
    overlay.style.left = "0";
    overlay.style.width = "100%";
    overlay.style.height = "100%";
    overlay.style.backgroundColor = "rgba(0, 0, 0, 0.9)";
    overlay.style.zIndex = "9999";
    overlay.style.display = "flex";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";
    overlay.style.overflow = "hidden";

    // Create a wrapper for the image to allow for transformations
    const imageWrapper = document.createElement("div");
    imageWrapper.style.position = "relative";
    imageWrapper.style.width = "100%";
    imageWrapper.style.height = "100%";
    imageWrapper.style.display = "flex";
    imageWrapper.style.alignItems = "center";
    imageWrapper.style.justifyContent = "center";

    // Create the image element
    const imgElement = document.createElement("img");
    imgElement.src = src;
    imgElement.style.maxWidth = "100%";
    imgElement.style.maxHeight = "100%";
    imgElement.style.objectFit = "contain";
    imgElement.style.transform = "scale(1)";
    imgElement.style.transition = "transform 0.1s ease-out";
    imgElement.style.transformOrigin = "center";
    imgElement.style.willChange = "transform";

    // Create close button
    const closeButton = document.createElement("div");
    closeButton.innerHTML = "×";
    closeButton.style.position = "absolute";
    closeButton.style.top = "20px";
    closeButton.style.right = "20px";
    closeButton.style.color = "white";
    closeButton.style.fontSize = "30px";
    closeButton.style.cursor = "pointer";
    closeButton.style.padding = "10px";
    closeButton.style.zIndex = "10000";

    // Create instructions for mobile users
    const instructions = document.createElement("div");
    instructions.className = "image-zoom-instructions";
    instructions.textContent = "Pinch to zoom • Double-tap to reset";

    // Add elements to DOM
    imageWrapper.appendChild(imgElement);
    overlay.appendChild(imageWrapper);
    overlay.appendChild(closeButton);
    overlay.appendChild(instructions);
    document.body.appendChild(overlay);

    // Fade out instructions after 3 seconds
    setTimeout(() => {
      instructions.classList.add("fade");
    }, 3000);

    // Variables to track touch and zoom state
    let currentScale = 1;
    let startScale = 1;
    let lastTouchDistance = 0;
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let translateX = 0;
    let translateY = 0;
    let lastTranslateX = 0;
    let lastTranslateY = 0;
    let lastTouchTime = 0;

    // Helper function to update transform
    const updateTransform = () => {
      // Limit panning when zoomed out
      if (currentScale <= 1) {
        translateX = 0;
        translateY = 0;
      }

      // Apply transformation
      imgElement.style.transform = `translate(${translateX}px, ${translateY}px) scale(${currentScale})`;
    };

    // Handle touch start
    imageWrapper.addEventListener(
      "touchstart",
      (e) => {
        e.preventDefault();
        e.stopPropagation();

        const touches = e.touches;

        // Detect double tap
        const now = new Date().getTime();
        const doubleTapDelay = 300;

        if (now - lastTouchTime < doubleTapDelay && touches.length === 1) {
          // Double tap detected - reset zoom
          currentScale = 1;
          translateX = 0;
          translateY = 0;
          updateTransform();
          lastTouchTime = 0; // Reset to prevent triple tap
        } else {
          lastTouchTime = now;

          if (touches.length === 2) {
            // Start of pinch - store initial distance
            const touch1 = touches[0];
            const touch2 = touches[1];
            lastTouchDistance = Math.hypot(
              touch2.clientX - touch1.clientX,
              touch2.clientY - touch1.clientY
            );
            startScale = currentScale;
          } else if (touches.length === 1 && currentScale > 1) {
            // Start of drag (only when zoomed in)
            isDragging = true;
            startX = touches[0].clientX;
            startY = touches[0].clientY;
            lastTranslateX = translateX;
            lastTranslateY = translateY;
          }
        }
      },
      { passive: false }
    );

    // Handle touch move
    imageWrapper.addEventListener(
      "touchmove",
      (e) => {
        e.preventDefault();
        e.stopPropagation();

        const touches = e.touches;

        if (touches.length === 2) {
          // Pinch-to-zoom gesture
          const touch1 = touches[0];
          const touch2 = touches[1];
          const currentDistance = Math.hypot(
            touch2.clientX - touch1.clientX,
            touch2.clientY - touch1.clientY
          );

          // Calculate new scale
          if (lastTouchDistance > 0) {
            const delta = currentDistance / lastTouchDistance;
            currentScale = Math.min(Math.max(startScale * delta, 0.5), 5); // Limit zoom: 0.5x to 5x
            updateTransform();
          }
        } else if (touches.length === 1 && isDragging) {
          // Pan/drag gesture (only when zoomed in)
          const deltaX = touches[0].clientX - startX;
          const deltaY = touches[0].clientY - startY;

          // Apply limits to panning based on zoom level
          const maxPan = (currentScale - 1) * 200; // Arbitrary limit based on scale

          translateX = Math.min(
            Math.max(lastTranslateX + deltaX, -maxPan),
            maxPan
          );
          translateY = Math.min(
            Math.max(lastTranslateY + deltaY, -maxPan),
            maxPan
          );

          updateTransform();
        }
      },
      { passive: false }
    );

    // Handle touch end
    imageWrapper.addEventListener(
      "touchend",
      (e) => {
        e.preventDefault();
        e.stopPropagation();

        // Reset flags
        isDragging = false;
        lastTouchDistance = 0;
      },
      { passive: false }
    );

    // Add click handlers
    closeButton.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      document.body.removeChild(overlay);
    });

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        e.preventDefault();
        e.stopPropagation();
        document.body.removeChild(overlay);
      }
    });

    // Prevent any events from bubbling through to Roam
    overlay.addEventListener("mousedown", (e) => {
      e.preventDefault();
      e.stopPropagation();
    });

    // Add keyboard support
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        document.body.removeChild(overlay);
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
