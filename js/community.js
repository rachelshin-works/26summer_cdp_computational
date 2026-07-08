(function () {
  const container = document.getElementById("sketch-container");
  const clearBtn = document.getElementById("clearCanvas");
  const saveBtn = document.getElementById("saveCanvas");
  const weightBtns = document.querySelectorAll("[data-weight]");

  let strokeWeight = 4;
  let p5Instance = null;

  const sketch = function (p) {
    p.setup = function () {
      const w = container.clientWidth;
      const canvas = p.createCanvas(w, 480);
      canvas.parent(container);
      p.background(0);
      p.stroke(255);
      p.strokeWeight(strokeWeight);
      p.strokeCap(p.ROUND);
      p.strokeJoin(p.ROUND);
      p.noFill();
    };

    p.draw = function () {
      if (
        p.mouseIsPressed &&
        p.mouseX >= 0 &&
        p.mouseX <= p.width &&
        p.mouseY >= 0 &&
        p.mouseY <= p.height
      ) {
        p.strokeWeight(strokeWeight);
        p.line(p.mouseX, p.mouseY, p.pmouseX, p.pmouseY);
      }
    };

    p.windowResized = function () {
      const snapshot = p.get();
      p.resizeCanvas(container.clientWidth, 480);
      p.image(snapshot, 0, 0);
    };

    p.clearCanvas = function () {
      p.background(0);
    };

    p.setStrokeWeight = function (weight) {
      strokeWeight = weight;
    };
  };

  p5Instance = new p5(sketch);

  weightBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      weightBtns.forEach(function (b) {
        b.classList.remove("active");
      });
      btn.classList.add("active");
      strokeWeight = Number(btn.dataset.weight);
      if (p5Instance) {
        p5Instance.setStrokeWeight(strokeWeight);
      }
    });
  });

  clearBtn.addEventListener("click", function () {
    if (p5Instance) {
      p5Instance.clearCanvas();
    }
  });

  saveBtn.addEventListener("click", function () {
    if (p5Instance) {
      p5Instance.save("my-bench.png");
    }
  });
})();
