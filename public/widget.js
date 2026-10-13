/**
 * FluxDesk Multi-Tenant Embeddable Chat Widget
 * 
 * Usage:
 * <script 
 *   src="https://your-domain.com/widget.js" 
 *   data-workspace-key="pk_live_..."
 *   async
 * ></script>
 */
(function () {
  if (window.__FluxDeskWidgetInitialized) return;
  window.__FluxDeskWidgetInitialized = true;

  // 1. Detect current script and extract workspace public key & host
  var scriptTag =
    document.currentScript ||
    document.querySelector("script[data-workspace-key]") ||
    document.querySelector("script[src*='widget.js']");

  var workspaceKey = scriptTag
    ? scriptTag.getAttribute("data-workspace-key") ||
      scriptTag.getAttribute("data-workspace") ||
      "pk_live_acme_cloud_tech"
    : "pk_live_acme_cloud_tech";

  var defaultAppUrl =
    (typeof window !== "undefined" && window.__FLUXDESK_APP_URL__) ||
    (scriptTag && scriptTag.getAttribute("data-app-url")) ||
    (typeof process !== "undefined" && process.env && process.env.NEXT_PUBLIC_APP_URL) ||
    "http://localhost:3000";

  var widgetOrigin = defaultAppUrl;
  try {
    if (scriptTag && scriptTag.src && scriptTag.src.indexOf("http") === 0) {
      widgetOrigin = new URL(scriptTag.src).origin;
    } else if (typeof window !== "undefined" && window.__FLUXDESK_APP_URL__) {
      widgetOrigin = window.__FLUXDESK_APP_URL__;
    } else if (scriptTag && scriptTag.getAttribute("data-app-url")) {
      widgetOrigin = scriptTag.getAttribute("data-app-url");
    } else if (typeof window !== "undefined" && window.location && window.location.origin) {
      widgetOrigin = window.location.origin;
    }
  } catch (e) {
    widgetOrigin = defaultAppUrl;
  }

  var iframeUrl = widgetOrigin + "/embed/chat?key=" + encodeURIComponent(workspaceKey);

  // 2. Inject CSS Styles
  var style = document.createElement("style");
  style.id = "fluxdesk-widget-styles";
  style.textContent = `
    #fluxdesk-widget-container {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 2147483647;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }

    #fluxdesk-launcher-bubble {
      height: 58px;
      min-width: 58px;
      border-radius: 29px;
      background: #2563eb;
      color: #ffffff;
      box-shadow: 0 8px 24px rgba(37, 99, 235, 0.45), 0 2px 6px rgba(0, 0, 0, 0.08);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      border: none;
      outline: none;
      transition: all 0.24s cubic-bezier(0.16, 1, 0.3, 1);
      user-select: none;
      padding: 0 16px;
      gap: 9px;
      -webkit-tap-highlight-color: transparent;
    }

    #fluxdesk-launcher-bubble:hover {
      transform: scale(1.05);
      box-shadow: 0 10px 28px rgba(37, 99, 235, 0.55), 0 3px 8px rgba(0, 0, 0, 0.12);
    }

    #fluxdesk-launcher-bubble:active {
      transform: scale(0.96);
    }

    #fluxdesk-launcher-bubble svg {
      width: 25px;
      height: 25px;
      fill: none;
      stroke: currentColor;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
      transition: transform 0.2s ease, opacity 0.2s ease;
      flex-shrink: 0;
    }

    #fluxdesk-launcher-text {
      font-size: 14px;
      font-weight: 600;
      letter-spacing: -0.01em;
      white-space: nowrap;
      transition: opacity 0.2s ease;
    }

    #fluxdesk-custom-launcher-icon {
      width: 26px;
      height: 26px;
      border-radius: 6px;
      object-fit: cover;
      flex-shrink: 0;
    }

    #fluxdesk-chat-iframe {
      position: fixed;
      bottom: 96px;
      right: 24px;
      width: 380px;
      max-width: calc(100vw - 32px);
      height: 600px;
      max-height: calc(100vh - 120px);
      border: none;
      border-radius: 18px;
      box-shadow: 0 16px 48px rgba(15, 23, 42, 0.22), 0 0 1px rgba(15, 23, 42, 0.1);
      z-index: 2147483646;
      display: none;
      opacity: 0;
      transform: translateY(16px) scale(0.96);
      transform-origin: bottom right;
      transition: opacity 0.24s cubic-bezier(0.16, 1, 0.3, 1), transform 0.24s cubic-bezier(0.16, 1, 0.3, 1);
      overflow: hidden;
      background: #ffffff;
    }

    #fluxdesk-chat-iframe.fluxdesk-open {
      display: block;
      opacity: 1;
      transform: translateY(0) scale(1);
    }

    @media (max-width: 480px) {
      #fluxdesk-chat-iframe {
        bottom: 0 !important;
        right: 0 !important;
        width: 100vw !important;
        max-width: 100vw !important;
        height: 100% !important;
        max-height: 100% !important;
        border-radius: 0 !important;
      }
    }
  `;
  document.head.appendChild(style);

  // 3. Create Container
  var container = document.createElement("div");
  container.id = "fluxdesk-widget-container";

  // 4. Create Launcher Bubble
  var launcher = document.createElement("button");
  launcher.id = "fluxdesk-launcher-bubble";
  launcher.setAttribute("type", "button");
  launcher.setAttribute("aria-label", "Toggle Support Chat");
  launcher.setAttribute("title", "Need help? Chat with us");

  var chatIconSvg =
    '<svg id="fluxdesk-icon-chat" viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>';
  var closeIconSvg =
    '<svg id="fluxdesk-icon-close" style="display:none;" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';

  launcher.innerHTML = chatIconSvg + closeIconSvg;
  container.appendChild(launcher);

  // 5. Create Iframe Element
  var iframe = document.createElement("iframe");
  iframe.id = "fluxdesk-chat-iframe";
  iframe.setAttribute("src", iframeUrl);
  iframe.setAttribute("title", "Support Chat");
  iframe.setAttribute("allow", "camera; microphone; clipboard-read; clipboard-write;");
  document.body.appendChild(iframe);
  document.body.appendChild(container);

  var isOpen = false;
  var currentBranding = {
    color: "#2563eb",
    launcherText: "Chat with us",
    showLauncherText: false,
    launcherIconUrl: "",
  };

  function updateLauncherAppearance() {
    var chatIcon = document.getElementById("fluxdesk-icon-chat");
    var closeIcon = document.getElementById("fluxdesk-icon-close");
    var textSpan = document.getElementById("fluxdesk-launcher-text");
    var customIconImg = document.getElementById("fluxdesk-custom-launcher-icon");

    if (isOpen) {
      if (chatIcon) chatIcon.style.display = "none";
      if (customIconImg) customIconImg.style.display = "none";
      if (textSpan) textSpan.style.display = "none";
      if (closeIcon) closeIcon.style.display = "block";
      launcher.style.padding = "0";
      launcher.style.width = "58px";
    } else {
      if (closeIcon) closeIcon.style.display = "none";

      if (currentBranding.launcherIconUrl) {
        if (chatIcon) chatIcon.style.display = "none";
        if (customIconImg) customIconImg.style.display = "block";
      } else {
        if (chatIcon) chatIcon.style.display = "block";
        if (customIconImg) customIconImg.style.display = "none";
      }

      if (currentBranding.showLauncherText && currentBranding.launcherText) {
        if (textSpan) {
          textSpan.style.display = "inline";
          textSpan.textContent = currentBranding.launcherText;
        }
        launcher.style.padding = "0 20px 0 16px";
        launcher.style.width = "auto";
      } else {
        if (textSpan) textSpan.style.display = "none";
        launcher.style.padding = "0";
        launcher.style.width = "58px";
      }
    }
  }

  function applyBranding(data) {
    if (data.color) {
      currentBranding.color = data.color;
      launcher.style.background = data.color;
      launcher.style.boxShadow = "0 8px 24px " + data.color + "66, 0 2px 6px rgba(0, 0, 0, 0.08)";
    }

    if (typeof data.showLauncherText === "boolean") {
      currentBranding.showLauncherText = data.showLauncherText;
    }
    if (data.launcherText) {
      currentBranding.launcherText = data.launcherText;
    }
    if (typeof data.launcherIconUrl === "string") {
      currentBranding.launcherIconUrl = data.launcherIconUrl;
    }

    // Ensure text span exists
    var textSpan = document.getElementById("fluxdesk-launcher-text");
    if (!textSpan && currentBranding.showLauncherText) {
      textSpan = document.createElement("span");
      textSpan.id = "fluxdesk-launcher-text";
      launcher.appendChild(textSpan);
    }

    // Ensure custom icon element exists if configured
    var customIconImg = document.getElementById("fluxdesk-custom-launcher-icon");
    if (currentBranding.launcherIconUrl) {
      if (!customIconImg) {
        customIconImg = document.createElement("img");
        customIconImg.id = "fluxdesk-custom-launcher-icon";
        launcher.insertBefore(customIconImg, launcher.firstChild);
      }
      customIconImg.src = currentBranding.launcherIconUrl;
    } else if (customIconImg) {
      customIconImg.remove();
    }

    updateLauncherAppearance();
  }

  function toggleWidget(forceState) {
    if (typeof forceState === "boolean") {
      isOpen = forceState;
    } else {
      isOpen = !isOpen;
    }

    if (isOpen) {
      iframe.style.display = "block";
      setTimeout(function () {
        iframe.classList.add("fluxdesk-open");
      }, 10);
      launcher.setAttribute("aria-expanded", "true");
    } else {
      iframe.classList.remove("fluxdesk-open");
      setTimeout(function () {
        if (!isOpen) {
          iframe.style.display = "none";
        }
      }, 240);
      launcher.setAttribute("aria-expanded", "false");
    }

    updateLauncherAppearance();
  }

  launcher.addEventListener("click", function (e) {
    e.preventDefault();
    toggleWidget();
  });

  // 6. Listen for iframe postMessage commands
  window.addEventListener("message", function (event) {
    if (!event.data) return;

    // Close request from embedded chat
    if (event.data === "fluxdesk:close" || event.data.type === "fluxdesk:close") {
      toggleWidget(false);
    }

    // Color only update
    if (event.data.type === "fluxdesk:set_brand_color" && event.data.color) {
      applyBranding({ color: event.data.color });
    }

    // Comprehensive branding update from iframe
    if (event.data.type === "fluxdesk:set_branding") {
      applyBranding(event.data);
    }
  });

  // Expose global controller API
  window.FluxDesk = {
    open: function () { toggleWidget(true); },
    close: function () { toggleWidget(false); },
    toggle: function () { toggleWidget(); },
    setKey: function (newKey) {
      workspaceKey = newKey;
      iframe.src = widgetOrigin + "/embed/chat?key=" + encodeURIComponent(newKey);
    },
    setBranding: function (branding) {
      applyBranding(branding);
    },
  };
})();
