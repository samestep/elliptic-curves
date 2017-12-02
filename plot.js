window.onload = () => {
  function add(a, b, p1, p2) {
    if (p1 === null) {
      return p2;
    } else if (p2 === null) {
      return p1;
    }
    const [x1, y1] = p1;
    const [x2, y2] = p2;
    let m;
    if (x1 !== x2) {
      m = (y2 - y1) / (x2 - x1);
    } else if (y1 !== y2) {
      return null;
    } else if (y1 !== 0) {
      m = (3*x1*x1 + a) / (2*y1);
    } else {
      return null;
    }
    const x3 = m*m - x1 - x2;
    const y3 = m*(x1 - x3) - y1;
    return [x3, y3];
  }

  function closestPoint(a, b, x, y) {
    // Differentiate the Weierstrass equation and solve for the derivative. Then
    // set the dot product of the tangent vector and the delta vector to be zero
    // and solve for y, which should yield the expression in the map call below.
    // Substituting back into the original Weierstrass equation should yield the
    // 7th-degree polynomial passed to the findRoots call.

    const points = findRoots([
      -a*a*b + 4*a*b*x - 4*b*x*x + a*a*y*y,
      -a*a*a - 4*a*b + 4*a*a*x + 8*b*x - 4*a*x*x,
      -4*a*a - 4*b - 6*a*b + 8*a*x + 12*b*x + 6*a*y*y,
      -4*a - 7*a*a - 12*b + 16*a*x - 4*x*x,
      -16*a - 9*b + 8*x + 9*y*y,
      -4 - 15*a + 12*x,
      -12,
      -9
    ])[0]
      .map(x0 => [x0, (3*x0*x0*y + a*y) / (2*x0 - 2*x + 3*x0*x0 + a)])
      .filter(([x0, y0]) => Math.abs(y0*y0 - (x0*x0*x0 + a*x0 + b)) < 1e-6);
    if (points.length > 0) {
      return points.reduce((best, next) => {
        const [l1, l2] = [best, next].map(([x0, y0]) => {
          return Math.pow(x - x0, 2) + Math.pow(y - y0, 2);
        });
        return l2 < l1 ? next : best;
      });
    } else {
      return null;
    }
  }

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

  // we'll assign this to paper.view.onMouseDown later with some modifications
  function handleParamClick(event) {
    const delta = event.point.subtract(discrim.getNearestPoint(event.point));
    const changeCurve = discrim.strokeWidth < delta.length;
    if (changeCurve) {
      now = before.add(after.subtract(before).multiply(1 - distance));
      before = now;
      after = event.point;
      distance = 1;
      const circle = new paper.Path.Circle(after, 0);
      circle.opacity = 1;
      circles.push(circle);
    } else {
      colorDistance = 1;
    }
    return changeCurve;
  }

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

  let mouseIn = false;
  let mousePos = new paper.Point(0, 0);

  document.getElementById('main').addEventListener('mouseout', event => {
    mouseIn = false;
  });
  paper.view.onMouseMove = event => {
    mouseIn = true;
    mousePos = event.point;
  };

  let closest = [0, 0];
  let primed = false;
  let pointSize = 0;
  let pointMarker = new paper.Path();

  let dyingSel = [];
  let sel = [];

  paper.view.onMouseDown = event => {
    if (primed && distance === 0 && sel.length < 3) {
      const solids = sel.map(({ point }, i) => {
        let color;
        if (sel.length < 2) {
          color = 'blue';
        } else if (i < 1) {
          color = 'green';
        } else {
          color = 'red';
        }
        const p1 = point;
        const p2 = closest;
        const p3 = add(now.y, now.x, p1, p2);
        let endpoints;
        if (p3 === null) {
          endpoints = [p1, p2];
        } else {
          const p4 = [p3[0], -p3[1]];
          const sorted = [p1, p2, p4].sort(([x1, y1], [x2, y2]) => x1 - x2);
          endpoints = [sorted[0], sorted[2]];
        }
        return {
          color: color,
          sum: p3,
          line: new paper.Path({
            strokeColor: color,
            strokeWidth: 0,
            segments: endpoints
          })
        };
      });
      const dashes = solids.map(({ color, sum }) => {
        return new paper.Path({
          strokeColor: color,
          strokeWidth: 0,
          segments: [[sum[0], sum[1]], [sum[0], -sum[1]]],
          dashArray: [0.1, 0.05]
        });
      })
      let color;
      if (sel.length < 1) {
        color = 'red';
      } else if (sel.length < 2) {
        color = 'green';
      } else {
        color = 'blue';
      }
      sel.push({
        point: closest,
        radius: 0,
        path: new paper.Path({ fillColor: color }),
        lines: solids.map(({ line }) => line).concat(dashes)
      });
    }
  };

  const tool = new paper.Tool();

  tool.onKeyDown = event => {
    if (event.key === 'escape') {
      dyingSel = dyingSel.concat(sel);
      sel = [];
    }
  };

  params.activate();
  paper.view.onMouseDown = event => {
    const changedCurve = handleParamClick(event);
    if (changedCurve) {
      dyingSel = dyingSel.concat(sel);
      sel = [];
    }
  };
  main.activate();

  paper.view.onFrame = event => {
    const { width, height } = paper.view.viewSize;
    paper.view.matrix = new paper.Matrix();
    paper.view.translate(paper.view.viewSize.divide(2));
    paper.view.scale(Math.min(width / 6, height / 6));

    const [a, b] = [now.y, now.x];
    paths.forEach(path => path.remove());
    const func = x => Math.sqrt(Math.pow(x, 3) + a*x + b);
    const roots = solveCubic(1, 0, a, b).sort();
    paths = makePaths(func, roots, paper.view.bounds);

    closest = closestPoint(a, b, mousePos.x, mousePos.y);
    primed = sel.length < 3
      && mouseIn
      && closest !== null
      && mousePos.subtract(closest).length <= 1;
    pointSize = primed
      ? Math.min(1, pointSize + 10*event.delta)
      : Math.max(0, pointSize - 10*event.delta);
    let pos = pointMarker.position;
    if (closest !== null) {
      const delta = pos.subtract(closest);
      const step = 20*Math.max(1, delta.length)*event.delta;
      pos = step < delta.length
        ? pos.subtract(delta.multiply(step / delta.length))
        : closest;
    }
    pointMarker.remove();
    pointMarker = new paper.Path.Circle(pos, 0.025*pointSize);
    pointMarker.fillColor = 'black';

    dyingSel = dyingSel.map(({ path: bigger, radius, lines }) => {
      bigger.remove();
      let { position } = bigger;
      radius = Math.max(0, radius - 10*event.delta);
      if (radius > 0) {
        const smaller = new paper.Path.Circle(position, 0.05*radius);
        smaller.fillColor = bigger.fillColor;
        lines.forEach(line => line.strokeWidth = 0.01*radius);
        return { path: smaller, radius: radius, lines: lines };
      } else {
        lines.forEach(line => line.remove());
        return null;
      }
    }).filter(dying => dying !== null);

    sel = sel.map(({ point, radius, path: smaller, lines }) => {
      radius = Math.min(1, radius + 10*event.delta);
      smaller.remove();
      const bigger = new paper.Path.Circle(point, 0.05*radius);
      bigger.fillColor = smaller.fillColor;
      lines.forEach(line => line.strokeWidth = 0.01*radius);
      return {
        point: point,
        radius: radius,
        path: bigger,
        lines: lines
      };
    });
  };
};
