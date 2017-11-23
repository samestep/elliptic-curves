window.onload = () => {
  function graphInterval(f, left, right, leftRoot, rightRoot, samples) {
    const xs = [...Array(samples).keys()].map(i => {
      return left + (i + 1)*(right - left)/(samples + 1);
    });
    const upper = xs.map(x => [x, f(x)]);
    const lower = upper.map(([x, y]) => [x, -y]);
    if (leftRoot) {
      if (rightRoot) {
        const points = [[right, 0]]
          .concat(upper.reverse())
          .concat([[left, 0]])
          .concat(lower);
        return [{ closed: true, points: points }];
      } else {
        const y = f(right);
        const points = [[right, -y]]
          .concat(lower.reverse())
          .concat([[left, 0]])
          .concat(upper)
          .concat([[right, y]]);
        return [{ closed: false, points: points }];
      }
    } else {
      if (rightRoot) {
        const y = f(left);
        const points = [[left, -y]]
          .concat(lower)
          .concat([[right, 0]])
          .concat(upper.reverse())
          .concat([[left, y]]);
        return [{ closed: false, points: points }];
      } else {
        const [leftY, rightY] = [left, right].map(x => f(x));
        const lowerPoints = [[left, -leftY]]
          .concat(lower)
          .concat([[right, -rightY]]);
        const upperPoints = [[left, leftY]]
          .concat(upper)
          .concat([[right, rightY]]);
        return [
          { closed: false, points: lowerPoints },
          { closed: false, points: upperPoints }
        ];
      }
    }
  }

  function graphWindow(f, roots, left, right, samples) {
    let sections = [];
    const root = roots[roots.length - 1];
    if (root < right) {
      const out = root < left;
      const start = out ? left : root;
      const section = graphInterval(f, start, right, !out, false, samples);
      sections = sections.concat(section);
    }
    if (roots.length > 1) {
      const section = graphInterval(f, roots[0], roots[1], true, true, samples);
      sections = sections.concat(section);
    }
    return sections;
  }

  paper.setup('canvas');

  function makePaths(f, roots, bounds, size) {
    const scale = Math.min(
      size.width / bounds.width,
      size.height / bounds.height
    );
    const parts = graphWindow(f, roots, bounds.left, bounds.right, 100);
    return parts.map(({ closed, points }) => {
      const segments = points.map(point => {
        return new paper.Point(point)
          .subtract(bounds.point)
          .subtract(bounds.size.divide(2))
          .multiply(scale)
          .add(size.divide(2));
      });
      const path = new paper.Path({
        closed: closed,
        segments: segments,
        strokeColor: 'black'
      });
      path.smooth();
      return path;
    });
  }

  let paths = [];

  function draw(a, b, size) {
    paths.forEach(path => path.remove());
    const func = x => Math.sqrt(Math.pow(x, 3) + a*x + b);
    const roots = solveCubic(1, 0, a, b).sort();
    paths = makePaths(func, roots, new paper.Rectangle(-3, -3, 6, 6), size);
  }

  let now = new paper.Point(0, 0);
  let next = paper.Point.random().multiply(3).add([-2, -1]);

  paper.view.onFrame = event => {
    const vector = next.subtract(now);
    now = now.add(vector.multiply(event.delta));
    draw(now.x, now.y, paper.view.viewSize);
    if (vector.length < 0.1) {
      next = paper.Point.random().multiply(3).add([-2, -1]);
    }
  };
};
