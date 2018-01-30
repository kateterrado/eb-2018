
d3.csv('data/flights-sample.csv', (error, flights) => {
  console.log(flights.length);

  var dispatch = d3.dispatch('update');

  // change formatting
  let formatNumber = d3.format(',d');

  let formatChange = d3.format('+,d');
  let formatDate = d3.timeFormat('%B %d, %Y');
  let formatTime = d3.timeFormat('%I:%M %p');

  // nest stuff
  let nestByDate = d3.nest()
    .key(d => d3.timeDay(d.date));

  // for each
  flights.forEach((d, i) => {
    d.index = i;
    d.date = parseDate(d.date);
    d.delay = +d.delay;
    d.distance = +d.distance;
    d.origin = d.origin;
  });
  console.log(flights)

  // crossfilter dimensions and groups
  let flight = crossfilter(flights);

  let all = flight.groupAll();
  let date = flight.dimension(d => d.date);
  let origins = flight.groupAll();
  let origin = flight.dimension(d => d.origin);

  //group by origins + destinations

  let dates = date.group(d3.timeDay);
  let hour = flight.dimension(d => d.date.getHours() + d.date.getMinutes() / 60);
  let hours = hour.group(Math.floor);
  let delay = flight.dimension(d => Math.max(-60, Math.min(149, d.delay)));
  let delays = delay.group(d => Math.floor(d / 10) * 10);
  let distance = flight.dimension(d => Math.min(1999, d.distance));
  let distances = distance.group(d => Math.floor(d / 50) * 50);
  window.origin = origin;
  window.delays = origins;

  let charts = [

    barChart()
      .dimension(hour)
      .group(hours)
      .x(d3.scaleLinear()
        .domain([0, 24])
        .rangeRound([0, 10 * 24])),

    barChart()
      .dimension(delay)
      .group(delays)
      .x(d3.scaleLinear()
          .domain([-60, 150])
          .rangeRound([0, 10 * 21])),

    barChart()
      .dimension(distance)
      .group(distances)
      .x(d3.scaleLinear()
        .domain([0, 2000])
        .rangeRound([0, 10 * 40])),

    barChart()
      .dimension(date)
      .group(dates)
      .round(d3.timeDay.round)
      .x(d3.scaleTime()
        .domain([new Date(2007, 12, 1), new Date(2008, 2, 8)])
        .rangeRound([0, 10 * 90]))
      .filter([new Date(2008, 1, 1), new Date(2008, 2, 1)]),

      barChart()
        .dimension(origin)
        .group(origins)
        // .xAxis()
        // .filter([new Date(2008, 1, 1), new Date(2008, 2, 1)]),

  ];


  // charts
  let chart = d3.selectAll('.chart')
    .data(charts);

  // lists
  let list = d3.selectAll('.list')
    .data([flightList]);

  // totals
  d3.selectAll('#total')
    .text(formatNumber(flight.size()));

  renderAll();

  // render
  function render(method) {
    d3.select(this).call(method);
  }

  // render when brushed
  function renderAll() {
    chart.each(render);
    list.each(render);
    d3.select('#active').text(formatNumber(all.value()));
    // d3.select('#plot1').call(mapRoutes());
    window.dimension = all
  }

  // date
  function parseDate(d) {
    return new Date(2007,
      d.substring(0, 2) - 1,
      d.substring(2, 4),
      d.substring(4, 6),
      d.substring(6, 8));
  }

  window.filter = filters => {
    filters.forEach((d, i) => {
      console.log(d)
      charts[i].filter(d);
    });
    renderAll();
  };

  window.reset = i => {
    charts[i].filter(null);
    renderAll();
  };

////// map stuff

d3.select('#plot1')
  .call(mapRoutes());

///////


  function flightList(div) {
    let flightsByDate = nestByDate.entries(date.top(40));
    div.each(function () {
      let date = d3.select(this).selectAll('.date')
        .data(flightsByDate, d => d.key);

      date.exit().remove();

      date.enter().append('div')
        .attr('class', 'date')
        .append('div')
          .attr('class', 'day')
          .text(d => formatDate(d.values[0].date))
        .merge(date);


      let flight = date.order().selectAll('.flight')
        .data(d => d.values, d => d.index);

      flight.exit().remove();

      let flightEnter = flight.enter().append('div')
        .attr('class', 'flight');

      flightEnter.append('div')
        .attr('class', 'time')
        .text(d => formatTime(d.date));

      flightEnter.append('div')
        .attr('class', 'origin')
        .text(d => d.origin);

      flightEnter.append('div')
        .attr('class', 'destination')
        .text(d => d.destination);

      flightEnter.append('div')
        .attr('class', 'distance')
        .text(d => `${formatNumber(d.distance)} miles`);

      flightEnter.append('div')
        .attr('class', 'delay')
        .classed('early', d => d.delay < 0)
        .text(d => `${formatChange(d.delay)} minutes`);

      flightEnter.merge(flight);
      flight.order();
    });
  }

  function barChart() {
    if (!barChart.id) barChart.id = 0;

    let margin = { top: 10, right: 13, bottom: 20, left: 10 };
    let x;
    let y = d3.scaleLinear().range([100, 0]);
    let id = barChart.id++;
    let axis = d3.axisBottom();
    let brush = d3.brushX();
    let brushDirty;
    let dimension;
    let group;
    let round;
    let gBrush;

    function chart(div) {
      let width = x.range()[1];
      let height = y.range()[0];

      brush.extent([[0, 0], [width, height]]);

      y.domain([0, group.top(1)[0].value]);

      div.each(function () {
        let div = d3.select(this);
        let g = div.select('g');

        // chart skeleton
        if (g.empty()) {
          div.select('.title').append('a')
            .attr('href', `javascript:reset(${id})`)
            .attr('class', 'reset')
            .text('reset')
            .style('display', 'none');

          g = div.append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g')
              .attr('transform', `translate(${margin.left},${margin.top})`);

          g.append('clipPath')
            .attr('id', `clip-${id}`)
            .append('rect')
              .attr('width', width)
              .attr('height', height);

          g.selectAll('.bar')
            .data(['background', 'foreground'])
            .enter().append('path')
              .attr('class', d => `${d} bar`)
              .datum(group.all());

          g.selectAll('.foreground.bar')
            .attr('clip-path', `url(#clip-${id})`);

          g.append('g')
            .attr('class', 'axis')
            .attr('transform', `translate(0,${height})`)
            .call(axis);

          // brush component
          gBrush = g.append('g')
            .attr('class', 'brush')
            .call(brush);

          gBrush.selectAll('.handle--custom')
            .data([{ type: 'w' }, { type: 'e' }])
            .enter().append('path')
              .attr('class', 'brush-handle')
              .attr('cursor', 'ew-resize')
              .attr('d', resizePath)
              .style('display', 'none');
        }

        // only redraw if set externally
        if (brushDirty !== false) {
          let filterVal = brushDirty;
          brushDirty = false;

          div.select('.title a').style('display', d3.brushSelection(div) ? null : 'none');

          if (!filterVal) {
            g.call(brush);

            g.selectAll(`#clip-${id} rect`)
              .attr('x', 0)
              .attr('width', width);

            g.selectAll('.brush-handle').style('display', 'none');
            renderAll();
          } else {
            let range = filterVal.map(x);
            brush.move(gBrush, range);
          }
        }

        g.selectAll('.bar').attr('d', barPath);
      });

      function barPath(groups) {
        let path = [];
        let i = -1;
        let n = groups.length;
        let d;
        while (++i < n) {
          d = groups[i];
          path.push('M', x(d.key), ',', height, 'V', y(d.value), 'h9V', height);
        }
        return path.join('');
      }

      function resizePath(d) {
        let e = +(d.type === 'e');
        let x = e ? 1 : -1;
        let y = height / 3;
        return `M${0.5 * x},${y}A6,6 0 0 ${e} ${6.5 * x},${y + 6}V${2 * y - 6}A6,6 0 0 ${e} ${0.5 * x},${2 * y}ZM${2.5 * x},${y + 8}V${2 * y - 8}M${4.5 * x},${y + 8}V${2 * y - 8}`;
      }
    }

    brush.on('start.chart', function () {
      let div = d3.select(this.parentNode.parentNode.parentNode);
      div.select('.title a').style('display', null);
    });

    brush.on('brush.chart', function () {
      let g = d3.select(this.parentNode);
      let brushRange = d3.event.selection || d3.brushSelection(this); // read brush range
      let xRange = x && x.range(); // read range from x scale
      let activeRange = brushRange || xRange; // default to x range if no brush range available

      let hasRange = activeRange &&
        activeRange.length === 2 &&
        !isNaN(activeRange[0]) &&
        !isNaN(activeRange[1]);

      if (!hasRange) return; // quit if we don't have a valid range

      // calculate current brush extents using x scale
      let extents = activeRange.map(x.invert);

      // if rounding fn supplied, then snap to rounded extents
      // and move brush rect to reflect rounded range bounds if it was set by user interaction
      if (round) {
        extents = extents.map(round);
        activeRange = extents.map(x);

        if (
          d3.event.sourceEvent &&
          d3.event.sourceEvent.type === 'mousemove'
        ) {
          d3.select(this).call(brush.move, activeRange);
        }
      }

      // move brush handles to start and end of range
      g.selectAll('.brush-handle')
        .style('display', null)
        .attr('transform', (d, i) => `translate(${activeRange[i]}, 0)`);

      // resize sliding window to reflect updated range
      g.select(`#clip-${id} rect`)
        .attr('x', activeRange[0])
        .attr('width', activeRange[1] - activeRange[0]);

      // filter the active dimension to the range extents
      dimension.filterRange(extents);


      // re-render the other charts accordingly
      renderAll();
    });

    brush.on('end.chart', function () {
      // reset corresponding filter if the brush selection was cleared
      // (e.g. user "clicked off" the active range)
      if (!d3.brushSelection(this)) {
        reset(id);
      }
    });

    chart.margin = function (_) {
      if (!arguments.length) return margin;
      margin = _;
      return chart;
    };

    chart.x = function (_) {
      if (!arguments.length) return x;
      x = _;
      axis.scale(x);
      return chart;
    };

    chart.y = function (_) {
      if (!arguments.length) return y;
      y = _;
      return chart;
    };

    chart.dimension = function (_) {
      if (!arguments.length) return dimension;
      dimension = _;
      return chart;
    };

    chart.filter = _ => {
      if (!_) dimension.filterAll();
      brushDirty = _;
      return chart;
    };

    chart.group = function (_) {
      if (!arguments.length) return group;
      group = _;
      return chart;
    };

    chart.round = function (_) {
      if (!arguments.length) return round;
      round = _;
      return chart;
    };

    chart.gBrush = () => gBrush;

    return chart;
  }

  // //Listen to global dispatcher events
  // dispatch.on('update',update);
  // update();
window.flight = flight;
});
