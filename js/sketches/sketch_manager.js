// sketch_manager.js — Iteration 3: single canvas, re-attached per section

function startP5() {

    var localRenderer = window.Renderer;

    function SketchManager() {
        var self = this;

        this.width = 600;
        this.height = 520;
        this.margin = { top: 0, left: 80, bottom: 40, right: 10 };
        this.canvasWidth = this.width + this.margin.left + this.margin.right;
        this.canvasHeight = this.height + this.margin.top + this.margin.bottom;

        this.state = { activeIndex: 0, progress: 0 };
        this.data = [];

        var sketch = function (p) {

            p.setup = function () {
                p.noStroke();
                p.frameRate(30);

                // INITIAL CANVAS CREATION (moved by sections.js)
                var c = p.createCanvas(self.canvasWidth, self.canvasHeight);
                c.class("p5Canvas");
            };

            p.draw = function () {
                var ai = self.state.activeIndex || 0;

                // Section 0 = transparent (matches intro behavior)
                if (ai === 0) {
                    p.clear();
                } else {
                    p.background(255);
                }

                self.draw(p);
            };

            p.mousePressed = function () {
                var ai = self.state.activeIndex || 0;

                var viz = null;
                if (ai === 1) viz = window.VizFuelTypes;
                if (ai === 2) viz = window.VizScatter;
                if (ai === 3) viz = window.VizScatter2;
                if (ai === 4) viz = window.VizBar2;
                if (ai === 5) viz = window.VizFilterPanel;
                if (ai === 6) viz = window.VizSearchCar;
                if (ai === 7) viz = window.VizCountry;

                if (viz && typeof viz.mousePressed === "function") {
                    viz.mousePressed(p, self);
                }
            };
        };

        this.p5 = new p5(sketch);
    }

    SketchManager.prototype.setState = function (s) {
        if (s.activeIndex !== undefined) this.state.activeIndex = s.activeIndex;
        if (s.progress !== undefined) this.state.progress = s.progress;
    };

    SketchManager.prototype.setData = function (newData) {
        return localRenderer.setData(this, newData);
    };

    SketchManager.prototype.draw = function (p) {
        var ai = this.state.activeIndex || 0;
        var progress = this.state.progress || 0;
        localRenderer.draw(p, this, ai, progress);
    };

    // Replace old instance if exists
    if (window.__sketchAPI && window.__sketchAPI.p5) {
        try { window.__sketchAPI.p5.remove(); } catch (e) {}
        window.__sketchAPI = null;
    }

    var manager = new SketchManager();

    var setDataResult = localRenderer.setData(manager);

    var api = {
        setState: manager.setState.bind(manager),
        setData: manager.setData.bind(manager),
        p5: manager.p5,
        data: manager.data
    };

    api.ready =
        (setDataResult && typeof setDataResult.then === "function")
            ? setDataResult.then(() => api)
            : Promise.resolve(api);

    api.ready.then(() => {
        window.__sketchAPI = api;
    });

    return api;
}
