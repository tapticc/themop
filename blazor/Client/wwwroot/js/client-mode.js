(function (global) {
    'use strict';

    let currentMode = false;
    let initialized = false;

    function getViewport() {
        const width = global.innerWidth || document.documentElement.clientWidth || 0;
        const height = global.innerHeight || document.documentElement.clientHeight || 0;

        return { width, height };
    }

    function detect() {
        const { width, height } = getViewport();

        const isPortrait = height > width;
        const isNarrow = width <= 800;

        const isGameClient = isPortrait && isNarrow;

        return {
            isGameClient,
            width,
            height,
            isPortrait,
            isNarrow,
            ratio: width > 0 ? height / width : 0
        };
    }

    function applyMode() {
        const result = detect();
        currentMode = result.isGameClient;

        document.documentElement.classList.toggle('game-client', currentMode);
        document.documentElement.classList.toggle('standard-client', !currentMode);

        return result;
    }

    function ensureInitialized() {
        if (initialized) {
            return;
        }

        global.addEventListener('resize', applyMode);
        global.addEventListener('orientationchange', applyMode);

        applyMode();
        initialized = true;
    }

    global.clientMode = {
        init: function () {
            ensureInitialized();
            return applyMode();
        },
        detect: function () {
            ensureInitialized();
            return detect();
        },
        isGameClient: function () {
            ensureInitialized();
            return currentMode;
        },
        refresh: function () {
            ensureInitialized();
            return applyMode();
        }
    };
})(window);