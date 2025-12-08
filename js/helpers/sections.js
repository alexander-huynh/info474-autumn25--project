// sections.js — Iteration 3: one-column scrolling with per-section viz slots

(function () {
    function displayData() {

        // Base config
        var defaults = {
            containerSelector: '#graphic',
            stepSelector: '.step',
            visSlotSelector: '.vis-slot',
            showAt: 0,
            trigger: 'center'
        };

        var cfg = Object.assign({}, defaults, window.ScrollDemoConfig || {});

        // Get all step & slot nodes (assumed 1-to-1)
        var stepNodes = Array.from(document.querySelectorAll(cfg.stepSelector));
        var slotNodes = Array.from(document.querySelectorAll(cfg.visSlotSelector));

        if (slotNodes.length !== stepNodes.length) {
            console.warn("sections.js: steps and vis-slots count mismatch", stepNodes.length, slotNodes.length);
        }

        // Start p5 when available
        (function callStartP5WithRetry(attempts) {
            attempts = attempts || 3;
            if (typeof startP5 === 'function') {
                var api = startP5();

                // Wait for API.ready if present
                var ready = api.ready && typeof api.ready.then === "function"
                    ? api.ready
                    : Promise.resolve(api);

                ready.then(function () {
                    window.__sketchAPI = api;

                    // Instantiate scroller
                    var ScrollerCtor = window.Scroller;
                    if (!ScrollerCtor) {
                        console.error("sections.js: Scroller missing");
                        return;
                    }

                    var sc = new ScrollerCtor(cfg.containerSelector, cfg.stepSelector, cfg.trigger);
                    console.log("sections.js: scroller active, steps =", sc.steps.length);
sc.on('active', function (index) {
    // Highlight text (skip dimming for image-only sections 8, 9, 10)
    stepNodes.forEach((el, i) => {
        var isImageOnlySection = (i === 8 || i === 9 || i === 10);
        if (isImageOnlySection) {
            el.style.opacity = '1';
        } else {
            el.style.opacity = (i === index) ? '1' : '0.2';
        }
    });

                        // Attach the viz canvas into this step’s slot
                        try {
                            var activeSlot = slotNodes[index];
                            if (activeSlot) {
                                activeSlot.innerHTML = "";   // clear old content
                                var canvasEl = document.querySelector(".p5Canvas");
                                if (canvasEl) activeSlot.appendChild(canvasEl);
                            }
                        } catch (e) {
                            console.error("sections.js: slot attach failed", e);
                        }

                        // Tell the sketch manager which visualization is active
                        if (window.__sketchAPI && window.__sketchAPI.setState) {
                            window.__sketchAPI.setState({ activeIndex: index });
                        }
                    });

                    sc.on('progress', function (index, progress) {
                        if (window.__sketchAPI && window.__sketchAPI.setState) {
                            window.__sketchAPI.setState({ progress: progress, activeIndex: index });
                        }
                    });
                });
            } else if (attempts > 0) {
                setTimeout(() => callStartP5WithRetry(attempts - 1), 200);
            } else {
                console.error("sections.js: startP5 never became available");
            }
        })(3);
    }

    // Wait for DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', displayData);
    } else {
        displayData();
    }
})();
