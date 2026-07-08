(function () {
  const container = document.getElementById("gallery-container");

  const IMAGES = [
    { path: "assets/backless-bench.jpg", label: "backless bench" },
    { path: "assets/leaning-bar.jpg", label: "leaning bar" },
    { path: "assets/backed-bench.jpg", label: "backed bench" },
  ];

  const sketch = function (p) {
    let items = [];
    let dragging = null;
    let dragOffsetX = 0;
    let dragOffsetY = 0;

    p.preload = function () {
      IMAGES.forEach(function (item) {
        item.img = p.loadImage(item.path);
      });
    };

    p.setup = function () {
      const canvas = p.createCanvas(container.clientWidth, 420);
      canvas.parent(container);

      const pad = 24;
      const slotW = (p.width - pad * (IMAGES.length + 1)) / IMAGES.length;
      const maxH = p.height - 80;

      items = IMAGES.map(function (item, i) {
        const gray = item.img.get();
        gray.filter(p.GRAY);

        const ratio = gray.height / gray.width;
        let w = slotW;
        let h = w * ratio;
        if (h > maxH) {
          h = maxH;
          w = h / ratio;
        }

        const x = pad + i * (slotW + pad) + (slotW - w) / 2;
        const y = (p.height - 50 - h) / 2;

        return {
          img: gray,
          label: item.label,
          x: x,
          y: y,
          w: w,
          h: h,
        };
      });
    };

    function hitTest(mx, my) {
      for (let i = items.length - 1; i >= 0; i--) {
        const item = items[i];
        if (
          mx >= item.x &&
          mx <= item.x + item.w &&
          my >= item.y &&
          my <= item.y + item.h
        ) {
          return i;
        }
      }
      return -1;
    }

    function bringToFront(index) {
      const item = items.splice(index, 1)[0];
      items.push(item);
      return item;
    }

    p.draw = function () {
      p.background(0);
      p.cursor(dragging ? "grabbing" : "default");

      items.forEach(function (item) {
        p.image(item.img, item.x, item.y, item.w, item.h);

        p.noStroke();
        p.fill(153);
        p.textAlign(p.CENTER, p.TOP);
        p.textSize(11);
        p.text(item.label, item.x + item.w / 2, item.y + item.h + 10);
      });

      const hoverIndex = dragging ? -1 : hitTest(p.mouseX, p.mouseY);
      if (hoverIndex !== -1) {
        p.cursor("grab");
      }
    };

    p.mousePressed = function () {
      if (
        p.mouseX < 0 ||
        p.mouseX > p.width ||
        p.mouseY < 0 ||
        p.mouseY > p.height
      ) {
        return;
      }

      const index = hitTest(p.mouseX, p.mouseY);
      if (index !== -1) {
        dragging = bringToFront(index);
        dragOffsetX = p.mouseX - dragging.x;
        dragOffsetY = p.mouseY - dragging.y;
      }
    };

    p.mouseDragged = function () {
      if (!dragging) return;

      dragging.x = p.mouseX - dragOffsetX;
      dragging.y = p.mouseY - dragOffsetY;
    };

    p.mouseReleased = function () {
      dragging = null;
    };

    p.windowResized = function () {
      p.resizeCanvas(container.clientWidth, 420);
    };
  };

  new p5(sketch);
})();
