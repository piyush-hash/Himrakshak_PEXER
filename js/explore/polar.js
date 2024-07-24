var propertiesPolar = {};

function createPolar(accidentsData, addFilter, removeFilter, selectPoint) {
  var parent = document.getElementById("polar");

  propertiesPolar.width = parent.clientWidth;
  propertiesPolar.height = constants.componentHeight;

  propertiesPolar.margin = 30;
  propertiesPolar.radius = Math.min(propertiesPolar.width, propertiesPolar.height) / 2 - propertiesPolar.margin;
  propertiesPolar.maxAltitude = 4500;
  propertiesPolar.minAltitude = 1000;

  propertiesPolar.r = d3.scaleLinear()
    .domain([propertiesPolar.maxAltitude, propertiesPolar.minAltitude])
    .range([0, propertiesPolar.radius]);

  function angleFromCoord(x, y) {
    // cartesian not centered but with x right direction, y top direction
    // return theta in [0, 2pi] on trigonometric circle (start on the right and goes anti clock wise)
    var theta = Math.atan(Math.abs(y / x));
    if (x >= 0 && y >= 0) { // cadran 1
      theta = theta
    } else if (x <= 0 && y >= 0) { // cadran 2
      theta = Math.PI - theta
    } else if (x <= 0 && y <= 0) { // cadran 3
      theta = Math.PI + theta;
    } else if (x >= 0 && y <= 0) { // cadran 4
      theta = 2 * Math.PI - theta
    }

    return theta
  }

  var dragStartAngle = undefined,
    dragEndAngle = undefined;

  var drag = d3.drag()
    .on("drag", dragged)
    .on("start", startDrag)
    .on("end", endDrag)


  var removeCurrentFilter = function () {
    if (propertiesPolar.filterName) {
      // avoids infinite calls
      var toRemove = propertiesPolar.filterName
      propertiesPolar.filterName = undefined;
      removeFilter(toRemove)
    }
    propertiesPolar.svg.selectAll(".selection").selectAll("*").remove();
  }

  function startDrag() {
    var x = d3.event.x,
      y = -d3.event.y;
    var angle = (Math.PI - angleFromCoord(x, y)) - Math.PI / 2;
    dragStartAngle = angle;
    dragEndAngle = angle

    removeCurrentFilter();

    if (d3.selectAll(".selection path").size() == 0) {
      d3.selectAll(".selection").append("path")
        .attr("opacity", 0.5)
        .attr("fill", "#3498db")
        .on("click", removeCurrentFilter);
    }

    d3.selectAll(".selection path")
      .attr("d", arc([0, propertiesPolar.radius, dragStartAngle, dragEndAngle]));
  }

  function dragged(d) {
    var x = d3.event.x,
      y = -d3.event.y;
    var angle = (Math.PI - angleFromCoord(x, y)) - Math.PI / 2;
    var maxDelta = Math.PI + 0.1

    if (Math.abs(angle - dragEndAngle) < maxDelta) {
      dragEndAngle = angle;
    } else if (Math.abs(2 * Math.PI + angle - dragEndAngle) < maxDelta) {
      dragEndAngle = 2 * Math.PI + angle;
    } else if (Math.abs(-2 * Math.PI + angle - dragEndAngle) < maxDelta) {
      dragEndAngle = -2 * Math.PI + angle;
    }

    d3.selectAll(".selection path")
      .attr("d", arc([0, propertiesPolar.radius, dragStartAngle, dragEndAngle]));
  }

  function endDrag() {
    var selectedAspects = aspectRangeAngle(dragStartAngle, dragEndAngle)
    if (selectedAspects.length == 0) {
      d3.selectAll(".selection path").remove();
      return;
    }
    if (selectedAspects.length == 1) {
      filterName = "Aspect " + selectedAspects[0];
    } else {
      filterName = "Aspect " + selectedAspects[0] + "-" + selectedAspects[selectedAspects.length - 1];
    }

    var filterFunction = function (d) {
      return selectedAspects.includes(d.Aspect);
    };

    propertiesPolar.filterName = filterName;
    addFilter(filterName, filterFunction, removeCurrentFilter)

    dragStartAngle = undefined;
    dragEndAngle = undefined;
  }

  propertiesPolar.svg = d3.select("#polar").append("svg")
    .attr("width", propertiesPolar.width)
    .attr("height", propertiesPolar.height)
    .append("g")
    .attr("transform", "translate(" + propertiesPolar.width / 2 + "," + propertiesPolar.height / 2 + ")");


  var arc = d3.arc()
    .innerRadius(function (d) {
      return d[0];
    })
    .outerRadius(function (d) {
      return d[1];
    })
    .startAngle(function (d) {
      return d[2];
    })
    .endAngle(function (d) {
      return d[3];
    });

  // full clickable cirle
  propertiesPolar.svg.append("g")
    .attr("class", "clickable")
    .append("path")
    .attr("d", arc([0, propertiesPolar.radius, 0, 2 * Math.PI]))
    .attr("fill", "white")
    .call(drag);

  var gr = propertiesPolar.svg.append("g")
    .attr("class", "r axis")
    .selectAll("g")
    // .data(propertiesPolar.r.ticks(4).slice(1))
    .data([1000, 2000, 3000, 4000])
    .enter().append("g");

  gr.append("circle")
    .attr("r", propertiesPolar.r)
    .attr("fill", "none")
    .attr("stroke", "grey")
    .attr("stroke-width", "1px");
    
  var labelBackgroundWidth = 24,
    labelBackgroundHeight = 12;

  gr.append("rect")
    .attr("transform", function (d) {
      return "translate(0," + (-propertiesPolar.r(d)) + ")"
    })
    .attr("x", - labelBackgroundWidth / 2)
    .attr("y", - labelBackgroundHeight / 2)
    .attr("width", labelBackgroundWidth)
    .attr("height", labelBackgroundHeight)
    .style("fill", "white");

  gr.append("text").text(function (d) {return d})
    .attr("transform", function (d) {
      return "translate(0," + (-propertiesPolar.r(d) + 4) + ")"
    })
    .attr("text-anchor", "middle")
    .style("fill", "grey")
    .style("font-size", ".7em")
    .classed("unselectable", true);

  var line = d3.radialLine()
    .radius(function (d) {
      return propertiesPolar.r(d[1]);
    })
    .angle(function (d) {
      return d[0];
    });
  propertiesPolar.line = line

  var ascpectLetters = propertiesPolar.svg.selectAll('.cardinals').data(['N', 'E', 'S', 'W'])
    .enter()
    .append("text")
    .attr("class", "cardinals")
    .attr("transform", function (d, i) {
      var coors = line([[i * Math.PI / 2, propertiesPolar.minAltitude - 270]]).slice(1).slice(0, -1);
      return "translate(" + coors + ")" + ((d == "S") ? "translate(0,12)" : "");
    })
    .attr("text-anchor", function (d) {
      switch (d) {
        case 'N': return 'middle';
        case 'E': return 'start';
        case 'S': return 'middle';
        case 'W': return 'end';
      }
    })
    .text(function (d) {return d;})
    .classed("cardinal-label", true)
    .classed("unselectable", true)


  propertiesPolar.svg.append("g")
    .attr("class", "selection");
}


function updatePolar(data, addFilter, removeFilter, selectPoint) {
  var line = propertiesPolar.line

  data = data.filter(function (d) { return constants.aspects.includes(d.Aspect) })

  var points = propertiesPolar.svg.selectAll(".point")
    .data(data, function (d) {
      return d.Date + ", " + d.Latitude + ", " + d.Longitude;
    });

  var pointsEnter = points.enter()

  pointsEnter.append("circle")
    .attr("class", "point")
    .on('click', function (d) {
      selectPoint(d.id);
    })
    .attr("transform", function (d) {
      var angle = aspect(d['Aspect'], 'angle');
      var elevation = d['Elevation'];
      var coors = line([
        [angle, elevation]
      ]).slice(1).slice(0, -1);
      return "translate(" + coors + ")";
    })
    .attr("r", function(x) { return constants.killedRadius(x) * 0.7; })
    .merge(points)
    .attr("fill", function (d) {return d.color;})
    .attr("opacity", function (d) {
      return d.selected ? 1 : 0.7;
    })
    .attr("stroke", function (d) {
      return d.selected ? '#2c3e50' : 'white';
    })
    .attr("stroke-width", '1px')
    .sort(function (a, b) {
      if (a.selected == b.selected) {
        return 0;
      } else if (a.selected) {
        return 1;
      } else {
        return -1;
      }
    });
  
  points.exit().remove();

}