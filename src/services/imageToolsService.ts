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
          opacity: 0.8;
          top: auto;
          bottom: 8px;
          padding: 6px 10px;
        }
        
        .${this.TOOLS_CONTAINER_CLASS} button {
          font-size: 22px !important;
          padding: 6px !important;
        }
        
        /* Fix for buttons being treated as links */
        .${this.TOOLS_CONTAINER_CLASS} button {
          -webkit-touch-callout: none;
          -webkit-user-select: none;
          user-select: none;
          -webkit-tap-highlight-color: transparent;
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
      }
      
      .${this.TOOLS_CONTAINER_CLASS} button:hover {
        background-color: rgba(255, 255, 255, 0.2);
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
      
      /* Additional styles for mobile */
      @media (max-width: 768px) {
        .image-zoom-modal img {
          max-width: 95%;
          max-height: 95%;
        }
        
        .image-zoom-close {
          top: 10px;
          right: 10px;
          font-size: 40px;
          padding: 10px;
        }
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

    // Check if on mobile
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) {
      // On mobile, make the image container have overflow visible to ensure buttons show
      parent.style.overflow = "visible";
      
      // Also add pointer-events to ensure clicks work properly
      toolsContainer.style.pointerEvents = "auto";
    }

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

    // For mobile, make sure the image itself is clickable to zoom
    if (isMobile) {
      img.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.openImageInModal(img.src);
      });
    }
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
    
    // Handle both click and touch events
    const handleAction = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      onClick();
      return false;
    };
    
    // Add event listeners for both mouse and touch events
    button.addEventListener("click", handleAction, false);
    button.addEventListener("touchend", handleAction, false);
    
    // Prevent default behavior for touchstart to avoid highlighting
    button.addEventListener("touchstart", (e) => {
      e.preventDefault();
      e.stopPropagation();
    }, false);
    
    return button;
  }

  /**
   * Opens an image in a modal for zooming
   */
  private static openImageInModal(src: string): void {
    // Check if it's a mobile device
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    if (isMobile) {
      // On mobile, always use our custom zoom modal instead of the native one
      this.showCustomZoomModal(src);
      return;
    }

    // For desktop, try to use Roam's native image click behavior first
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
    closeButton.addEventListener("click", (e) => {
      e.stopPropagation();
      document.body.removeChild(modal);
    });

    // Create image element
    const img = document.createElement("img");
    
    // Add tap-to-close functionality for mobile
    img.addEventListener("click", (e) => {
      e.stopPropagation();
      // Do nothing on image click to prevent accidental closes
    });
    
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
   * Copies an image to the clipboard
   */
  private static copyImageToClipboard(img: HTMLImageElement): void {
    // Check if it's a mobile device
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    if (isMobile) {
      // For mobile devices, try to use the modern Clipboard API with fetched image data first
      try {
        this.showMobileNotification("Copying image...");
        
        // Create a canvas to better handle the image
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Set dimensions
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        
        // Draw image to canvas
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          
          // Try to export as blob and use modern clipboard API
          canvas.toBlob((blob) => {
            if (blob) {
              // Try using the clipboard API directly
              if (navigator.clipboard && navigator.clipboard.write) {
                const clipboardItem = new ClipboardItem({ [blob.type]: blob });
                navigator.clipboard.write([clipboardItem])
                  .then(() => {
                    this.showMobileNotification("Image copied to clipboard");
                  })
                  .catch(err => {
                    console.error("Mobile clipboard API failed", err);
                    this.fallbackMobileCopy(img);
                  });
              } else {
                this.fallbackMobileCopy(img);
              }
            } else {
              this.fallbackMobileCopy(img);
            }
          });
        } else {
          this.fallbackMobileCopy(img);
        }
      } catch (e) {
        console.error("Advanced mobile copy failed", e);
        this.fallbackMobileCopy(img);
      }
      return;
    }
    
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
                this.fallbackDesktopCopyImage(img);
              });
          } catch (e) {
            console.log(
              "ClipboardItem not supported, trying fallback method",
              e
            );
            this.fallbackDesktopCopyImage(img);
          }
        })
        .catch((err) => {
          console.error("Failed to fetch image data", err);
          this.fallbackDesktopCopyImage(img);
        });
    } catch (error) {
      console.error("Failed to copy image:", error);
      this.fallbackDesktopCopyImage(img);
    }
  }

  /**
   * Fallback method for copying images on mobile
   */
  private static fallbackMobileCopy(img: HTMLImageElement): void {
    // Option 1: Try to use the Share API if available (modern mobile browsers)
    if (navigator.share) {
      try {
        // Convert image to blob for sharing
        fetch(img.src)
          .then(response => response.blob())
          .then(blob => {
            // Create a File from the Blob
            const file = new File([blob], "image.jpg", { type: blob.type });
            
            // Share the file
            navigator.share({
              title: 'Shared Image',
              files: [file]
            })
            .then(() => {
              this.showMobileNotification("Image shared");
            })
            .catch(err => {
              console.error("Share API failed", err);
              // Fall back to URL copying
              this.copyImageUrlToClipboard(img);
            });
          })
          .catch(err => {
            console.error("Failed to fetch image for sharing", err);
            this.copyImageUrlToClipboard(img);
          });
      } catch (e) {
        console.error("Share API error", e);
        this.copyImageUrlToClipboard(img);
      }
    } else {
      // If Share API is not available, fall back to copying the URL
      this.copyImageUrlToClipboard(img);
    }
  }

  /**
   * Copy image URL to clipboard with notification
   */
  private static copyImageUrlToClipboard(img: HTMLImageElement): void {
    this.showMobileNotification("Copying image link...");
    
    navigator.clipboard.writeText(img.src)
      .then(() => {
        this.showMobileNotification("Image link copied to clipboard");
      })
      .catch(err => {
        console.error("Failed to copy URL", err);
        // Last resort - open in new tab
        this.showMobileNotification("Opening image in new tab...");
        window.open(img.src, '_blank');
      });
  }

  /**
   * Saves an image to the device
   */
  private static saveImage(img: HTMLImageElement): void {
    // Check if it's a mobile device
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    if (isMobile) {
      // For mobile devices, try multiple approaches
      try {
        // Option 1: Try the File System Access API if available
        if ('showSaveFilePicker' in window) {
          this.showMobileNotification("Preparing to save image...");
          
          // Convert image to blob
          fetch(img.src)
            .then(response => response.blob())
            .then(async blob => {
              try {
                // Get filename
                let filename = this.getFilenameFromUrl(img.src);
                
                // @ts-ignore - This API might not be available in all browsers
                const fileHandle = await window.showSaveFilePicker({
                  suggestedName: filename,
                  types: [{
                    description: 'Images',
                    accept: { [blob.type]: ['.jpg', '.jpeg', '.png', '.gif'] }
                  }]
                });
                
                const writable = await fileHandle.createWritable();
                await writable.write(blob);
                await writable.close();
                
                this.showMobileNotification("Image saved");
              } catch (e) {
                console.error("Save file picker failed", e);
                this.tryMobileShareForSave(img);
              }
            })
            .catch(err => {
              console.error("Blob creation failed", err);
              this.tryMobileShareForSave(img);
            });
        } else {
          this.tryMobileShareForSave(img);
        }
      } catch (e) {
        console.error("Advanced mobile save failed", e);
        this.tryMobileShareForSave(img);
      }
      return;
    }
    
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
   * Try using Share API for saving on mobile
   */
  private static tryMobileShareForSave(img: HTMLImageElement): void {
    // Try Share API for share/save
    if (navigator.share) {
      try {
        fetch(img.src)
          .then(response => response.blob())
          .then(blob => {
            const file = new File([blob], this.getFilenameFromUrl(img.src), { type: blob.type });
            
            this.showMobileNotification("Please select save option...");
            
            navigator.share({
              title: 'Save Image',
              files: [file]
            })
            .then(() => {
              this.showMobileNotification("Image shared/saved");
            })
            .catch(err => {
              console.error("Share API failed", err);
              this.openImageInNewTab(img);
            });
          })
          .catch(err => {
            console.error("Failed to fetch image for sharing", err);
            this.openImageInNewTab(img);
          });
      } catch (e) {
        console.error("Share API error", e);
        this.openImageInNewTab(img);
      }
    } else {
      // Last resort: open in new tab
      this.openImageInNewTab(img);
    }
  }
  
  /**
   * Open image in new tab with download instructions
   */
  private static openImageInNewTab(img: HTMLImageElement): void {
    this.showMobileNotification("Opening in new tab, long press to save");
    
    // Create a data URL from the image if possible to avoid CORS issues
    try {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        try {
          const dataUrl = canvas.toDataURL('image/png');
          window.open(dataUrl, '_blank');
          return;
        } catch (e) {
          console.error("Data URL creation failed", e);
        }
      }
    } catch (e) {
      console.error("Canvas creation failed", e);
    }
    
    // Fallback to original URL
    window.open(img.src, '_blank');
  }
  
  /**
   * Helper to get filename from URL
   */
  private static getFilenameFromUrl(url: string): string {
    let filename = "roam-image-" + new Date().getTime() + ".png";
    try {
      // Extract filename from URL if possible
      const urlParts = url.split("/");
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
    return filename;
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
   * Show a temporary notification for mobile devices
   */
  private static showMobileNotification(message: string, duration: number = 2000): void {
    // Create notification element
    const notification = document.createElement("div");
    notification.style.position = "fixed";
    notification.style.bottom = "20px";
    notification.style.left = "50%";
    notification.style.transform = "translateX(-50%)";
    notification.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
    notification.style.color = "white";
    notification.style.padding = "10px 20px";
    notification.style.borderRadius = "5px";
    notification.style.zIndex = "10000";
    notification.style.fontFamily = "sans-serif";
    notification.textContent = message;

    // Add to body
    document.body.appendChild(notification);

    // Remove after duration
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    }, duration);
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

  /**
   * Fallback method to copy an image via context menu (for desktop)
   */
  private static fallbackDesktopCopyImage(img: HTMLImageElement): void {
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
}
