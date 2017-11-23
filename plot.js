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

  const params = new paper.PaperScope();
  params.activate();
  paper.setup('params');
  const { width, height } = paper.view.viewSize;
  paper.view.scale(width / 3, height / 3, [0, 0]);
  paper.view.translate([1, 2]);

  const detail = 100;

  function makeDiscriminant(left, right) {
    const path = new paper.Path();
    for (let i = left*detail; i <= right*detail; i++) {
      const b = i/detail;
      const a = -Math.pow(27*Math.pow(b, 2)/4, 1/3);
      path.add([b, a]);
    }
    return path;
  }

  const discrim = makeDiscriminant(-1, 0);
  discrim.strokeWidth = 0.05;
  discrim.strokeJoin = 'round';
  const other = makeDiscriminant(0, 2);
  [discrim, other].forEach(path => path.smooth({ type: 'continuous' }));
  discrim.join(other);

  const aAxis = new paper.Path({
    strokeColor: 'black',
    strokeWidth: 0.01,
    segments: [[-1, 0], [2, 0]]
  });
  const bAxis = new paper.Path({
    strokeColor: 'black',
    strokeWidth: 0.01,
    segments: [[0, -2], [0, 1]]
  });

  let colorDistance = 0;
  let now = new paper.Point(1, -1);
  let before = now;
  let after = now;
  let distance = 0;
  let circles = [];

  paper.view.onMouseDown = event => {
    const delta = event.point.subtract(discrim.getNearestPoint(event.point));
    if (delta.length <= discrim.strokeWidth) {
      colorDistance = 1;
    } else {
      now = before.add(after.subtract(before).multiply(1 - distance));
      before = now;
      after = event.point;
      distance = 1;
      const circle = new paper.Path.Circle(after, 0);
      circle.opacity = 1;
      circles.push(circle);
    }
  };

  paper.view.onFrame = event => {
    colorDistance = Math.max(0, colorDistance - 2*event.delta);
    const [pink, red] = ['pink', 'red'].map(name => new paper.Color(name));
    discrim.strokeColor = pink.add(red.subtract(pink).multiply(colorDistance));

    distance = Math.max(0, distance - 2*event.delta);
    circles = circles.map(smaller => {
      smaller.remove();
      let { position, opacity } = smaller;
      opacity = Math.max(0, opacity - 2*event.delta);
      if (opacity > 0) {
        const bigger = new paper.Path.Circle(position, 0.1*(1 - opacity));
        bigger.fillColor = 'black';
        bigger.opacity = opacity;
        return bigger;
      } else {
        return null;
      }
    }).filter(circle => circle !== null);

    now = before.add(after.subtract(before).multiply(1 - distance));
    aAxis.position.y = now.y;
    bAxis.position.x = now.x;
  };

  const main = new paper.PaperScope();
  main.activate();
  paper.setup('main');

  function makePaths(f, roots, bounds) {
    const parts = graphWindow(f, roots, bounds.left, bounds.right, 100);
    return parts.map(({ closed, points }) => {
      const path = new paper.Path({
        closed: closed,
        segments: points,
        strokeColor: 'black',
        strokeWidth: 0.01
      });
      path.smooth({ type: 'continuous' });
      return path;
    });
  }

  let paths = [];

  paper.view.onFrame = event => {
    const { width, height } = paper.view.viewSize;
    paper.view.matrix = new paper.Matrix();
    paper.view.translate(paper.view.viewSize.divide(2));
    paper.view.scale(Math.min(width / 6, height / 6));

    let [a, b] = [now.y, now.x];
    paths.forEach(path => path.remove());
    const func = x => Math.sqrt(Math.pow(x, 3) + a*x + b);
    const roots = solveCubic(1, 0, a, b).sort();
    paths = makePaths(func, roots, paper.view.bounds);
  };
};
