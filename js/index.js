// this is babel transpiled code
// for original ES6 code see ./babel/index.babel

var urlGeo =
  'https://raw.githubusercontent.com/no-stack-dub-sack/testable-projects-fcc/master/src/data/choropleth_map/counties.json'
var urlEdu =
  'https://raw.githubusercontent.com/no-stack-dub-sack/testable-projects-fcc/master/src/data/choropleth_map/for_user_education.json'

// map svg sizing
var w = 1060
var h = 600

// create main svg
var svg = d3
  .select('main')
  .append('svg')
  .attr('id', 'map-svg')
  .attr('width', w)
  .attr('height', h)

// create tooltip element
var tooltip = d3
  .select('body')
  .append('div')
  .attr('id', 'tooltip')
  .style('opacity', 0)

// load in data
Promise.all([d3.json(urlGeo), d3.json(urlEdu)]).then(function(files) {
  var geoData = files[0]
  var eduData = files[1]
  var statesFeatures = topojson.feature(geoData, geoData.objects.states).features
  var countiesFeatures = topojson.feature(geoData, geoData.objects.counties).features
  var path = d3.geoPath()

// create threshold scale
  var numColors = 8
  var color = d3
    .scaleThreshold()
    .domain([6, 12, 18, 24, 30, 40, 50])
    .range(d3.schemeBrBG[numColors])

// cross reference data files by id. find data entry and return key value if specified 
// otherwise return the matched data entry
// implements memoization for better performance on repeated calls on the same id
  var memoMap = new Map();

  function getValueOf(id, key) {
    var found = "data not found";
    if (memoMap.has(id)) {
      found = memoMap.get(id);
    } else {
      found = eduData.filter(function (x) {return x.fips === id;})[0];
      memoMap.set(id, found);
    }
    return arguments[1] ? found[key] : found;
  }

// add representation for data points
  var counties = svg.selectAll('path')
  counties
    .data(countiesFeatures)
    .enter()
    .append('path')
    .attr('class', 'county')
    .attr('d', path)
    .attr('data-fips', function(d) {
      return d.id
    })
    .attr('data-education', function(d) {
      return getValueOf(d.id, 'bachelorsOrHigher')
    })
    .style('fill', function(d) {
      return color(getValueOf(d.id, 'bachelorsOrHigher'))
    })

  //  add event listeners
    .on('mousemove', function(d) {
      tooltip.style('opacity', 0.85).attr('data-education', getValueOf(d.id, 'bachelorsOrHigher'))

      var getTooltipLeftOffset = function getTooltipLeftOffset() {
        var posX = d3.event.pageX
        var screenWidth = window.innerWidth
        return posX < screenWidth - 250 ? posX + 20 + 'px' : posX - 220 + 'px'
      }
      tooltip
        .html(formatDataHTML(d))
        .style('top', d3.event.pageY - 75 + 'px')
        .style('left', getTooltipLeftOffset())
        .style('border', '4px solid ' + color(getValueOf(d.id, 'bachelorsOrHigher')))
    })
    .on('mouseout', function(d) {
      tooltip.style('opacity', 0)
    })

// create HTML for the tooltip
  function formatDataHTML(d) {
    var data = getValueOf(d.id)
    var f1 = d3.format('.1f')
    return (
      '<table>\n            <tr>\n                <td colspan="2">' +
      data.area_name +
      ', ' +
      data.state +
      '</td>\n              </tr>\n              <tr>\n                <th>Bachelor or higher: </th><td>' +
      f1(data.bachelorsOrHigher) +
      ' %</td>\n              </tr>\n            </table>'
    )
  }

// draw state borders
  var states = svg.append('path').attr('class', 'state')
  states
    .datum(topojson.mesh(geoData, geoData.objects.states), function(a, b) {
      return a !== b
    })
    .attr('d', path)
    .attr('stroke', 'SlateGray')
    .attr('stroke-width', 1)
    .attr('fill', 'none')

// create scale for legend
  var y = d3
    .scaleLinear()
    .domain([0, 64])
    .range([360, 0]) // the axis should be flipped

  var yAxis = d3
    .axisRight(y)
    .tickValues(color.domain())
    .tickSize(0)
    .tickPadding(24)
    .tickFormat(function(t) {
      return t + ' %'
    })

  var g = svg
    .append('g')
    .attr('id', 'legend')
    .attr('transform', 'translate(1000, 160)')
    .call(yAxis)

  g.select('.domain').remove() // remove the axis domain line

// add colors to the legend
// create an array that holds the start and end (domain) value of each threshold class
  g.selectAll('rect')
    .data(
      color.range().map(function(c) {
        var d = color.invertExtent(c)
        if (!d[0]) d[0] = y.domain()[0] // complete the boundary pair
        if (!d[1]) d[1] = y.domain()[1] // for the first and last threshold values
        return d
      })
    )
    .enter()
    .insert('rect', '.tick')
    .attr('y', function(d) {
      return y(d[0]) - getScaledHeight(d[0], d[1])
    })
    .attr('height', function(d) {
      return getScaledHeight(d[0], d[1])
    })
    .attr('width', 16)
    .attr('fill', function(d) {
      return color(d[0])
    })
    .attr('stroke', 'black')

  function getScaledHeight(y1, y2) {
    return Math.abs(y(y2) - y(y1))   // height value must be positive
  }
})
