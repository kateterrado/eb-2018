function mapRoutes(){

let exports = function(selection){
  // we append svg and set height width here
// <svg width="960" height="600"></svg>

// const w = d3.select('.plot-1').node().clientWidth,
// 	h = d3.select('.plot-1').node().clientHeight;
//
// const svg = d3.select('.plot-1').append('svg')
//   .attr('width',w)
//   .attr('height',h)
//   .style('position','absolute')
//   .style('top',0)
//   .style('left',0);
//
// const canvas = d3.select('.plot-1').append('canvas')
//   .attr('width',w)
//   .attr('height',h)
//   .style('position','absolute')
//   .style('top',0)
//   .style('left',0);
//
// const ctx = canvas.node().getContext('2d');


let svg = d3.select("svg"),
    width = +svg.attr("width"),
    height = +svg.attr("height")

let projection = d3.geoAlbers()
    .translate([width / 2, height / 2])
    .scale(1280);

let radius = d3.scaleSqrt()
    .domain([0, 100])
    .range([0, 14]);

let path = d3.geoPath()
    .projection(projection)
    .pointRadius(1.5);

let voronoi = d3.voronoi()
    .extent([[-1, -1], [width + 1, height + 1]]);

// let xScale = d3.scaleLinear();
// let yScale = d3.scaleLinear();

    // let minDelay = 2;
    // let maxDelay = 30;
    //
    // let delayScale = d3.scalePow()
    //   .exponent(2)
    //   .domain([0, Math.max(Math.abs(minDelay), Math.abs(maxDelay))])
    //   .range([4, 300]);


d3.queue()
    .defer(d3.json, "./data/us.json")
    .defer(d3.csv, "./data/airports.csv", typeAirport)
    .defer(d3.csv, "./data/routeCount.csv", typeFlight)
    .await(ready);

function ready(error, us, airports, flights) {
  console.log("flights",flights)
  if (error) throw error;

  let airportByIata = d3.map(airports, function(d) { return d.iata; });

  flights.forEach(function(flight) {
    let source = airportByIata.get(flight.origin),
        target = airportByIata.get(flight.destination);
    source.arcs.coordinates.push([source, target]);
    target.arcs.coordinates.push([target, source]);
  });
// console.log("what",airports, airports.length)


  airports = airports
      .filter(function(d) { return d.arcs.coordinates.length; });


  svg.append("path")
      .datum(topojson.feature(us, us.objects.land))
      .attr("class", "land")
      .attr("d", path);

  svg.append("path")
      .datum(topojson.mesh(us, us.objects.states, function(a, b) { return a !== b; }))
      .attr("class", "state-borders")
      .attr("d", path);

// filter airport dots based on the list of orig dest that the crossfilter data generates
// for each of the fltered results the orig and dest need to be
// we get the values of both dest and origins out in a list and then filter the airports data here based on if
// it is in the filtered list and show it.


  svg.append("path")
      .datum({type: "MultiPoint", coordinates: airports})
      .attr("class", "airport-dots")
      .attr("d", path);

  svg.on("click", function() {
      let coords = d3.mouse(this);
      // window.filter([null,null,null,null,1])

  let newData = {
      x: Math.round(xScale.invert(coords[0])),  // Takes the pixel number to convert to number
      y: Math.round(yScale.invert(coords[1]))
  };

  dataset.push(newData);   // Push data to our array

  svg.selectAll("circle")  // For new circle, go through the update process
      .data(dataset)
      .enter()
      .append("circle")
      .attr(circleAttrs)  // Get attributes from circleAttrs var
      .on("mouseover", handleMouseOver)
      .on("mouseout", handleMouseOut);
             })

//// animation







  let airport = svg.selectAll(".airport")
    .data(airports)
    .enter().append("g")
      .attr("class", "airport");

  airport.append("title")
      .text(function(d) { return d.iata + "\n" + d.arcs.coordinates.length + " routes"; });

  airport.append("path")
      .attr("class", "airport-arc")
      .attr("d", function(d) { return path(d.arcs); });

  airport.append("path")
      .data(voronoi.polygons(airports.map(projection)))
      .attr("class", "airport-cell")
      .attr("d", function(d) { return d ? "M" + d.join("L") + "Z" : null; });

}


function drawBase(){
        svg.append("path")
            .datum(topojson.feature(us, us.objects.land))
            .attr("class", "land")
            .attr("d", path);

        svg.append("path")
            .datum(topojson.mesh(us, us.objects.states, function(a, b) { return a !== b; }))
            .attr("class", "state-borders")
            .attr("d", path);


}

function typeAirport(d) {
  d[0] = +d.longitude;
  d[1] = +d.latitude;
  d.arcs = {type: "MultiLineString", coordinates: []};
  return d;
}

function typeFlight(d) {
  d.count = +d.count;
  return d;
}


}

return exports;

}
