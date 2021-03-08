import "normalize.css/normalize.css";

import * as d3 from "d3";

const API = "https://coordinape.me";

const width = 1000;
const height = width;
const innerRadius = Math.min(width, height) * 0.5 - 120;
const outerRadius = innerRadius + 5;

const formatValue = (x) => `${x.toFixed(0)} GIVE`;

const ribbon = d3
  .ribbonArrow()
  .radius(innerRadius - 0.5)
  .padAngle(1 / innerRadius);

const chord = d3
  .chordDirected()
  .padAngle(12 / innerRadius)
  .sortSubgroups(d3.descending)
  .sortChords(d3.descending);

const arc = d3.arc().innerRadius(innerRadius).outerRadius(outerRadius);

(async function () {
  const users = await fetch(`${API}/api/users`).then((res) => res.json());
  const gifts = await fetch(`${API}/api/pending-token-gifts`).then((res) =>
    res.json()
  );

  const ids = {};
  const names = [];
  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    ids[user.address] = {
      ...user,
      id: i,
    };
    names[i] = user.name.replace(/\([^)]*\)/, "");
  }

  const matrix = [];
  for (let i = 0; i < users.length; i++) {
    matrix[i] = [];
    for (let j = 0; j < users.length; j++) {
      matrix[i][j] = 0;
    }
  }

  for (const gift of gifts) {
    const from = ids[gift.sender_address];
    const to = ids[gift.recipient_address];
    if (from && to) matrix[from.id][to.id] = gift.tokens;
  }

  const color = d3.scaleOrdinal(
    names,
    d3.quantize(d3.interpolateRainbow, names.length)
  );

  const svg = d3
    .create("svg")
    .attr("preserveAspectRatio", "xMinYMin meet")
    .attr("viewBox", [-width / 2, -height / 2, width, height]);

  const chords = chord(matrix);

  svg
    .append("path")
    .attr("fill", "none")
    .attr("d", d3.arc()({ outerRadius, startAngle: 0, endAngle: 2 * Math.PI }));

  svg
    .append("g")
    .attr("fill-opacity", 0.75)
    .selectAll("g")
    .data(chords)
    .join("path")
    .attr("d", ribbon)
    .attr("fill", (d) => color(names[d.target.index]))
    .append("title")
    .text(
      (d) =>
        `${names[d.source.index]} gifted ${names[d.target.index]} ${formatValue(
          d.source.value
        )}`
    );

  svg
    .append("g")
    .attr("font-family", "monospace")
    .attr("font-size", 10)
    .attr("fill", "#fff")
    .selectAll("g")
    .data(chords.groups)
    .join("g")
    .call(
      (g) =>
        g
          .append("path")
          .attr("d", arc)
          .attr("fill", (d) => color(names[d.index]))
      // .attr("stroke", "#fff")
    )
    .call((g) =>
      g
        .append("text")
        .each((d) => (d.angle = (d.startAngle + d.endAngle) / 2))
        .attr("dy", "0.35em")
        .attr(
          "transform",
          (d) => `
          rotate(${(d.angle * 180) / Math.PI - 90})
          translate(${outerRadius + 5})
          ${d.angle > Math.PI ? "rotate(180)" : ""}
        `
        )
        .attr("text-anchor", (d) => (d.angle > Math.PI ? "end" : null))
        .text((d) =>
          d3.sum(matrix[d.index]) > 0 ||
          d3.sum(matrix, (row) => row[d.index]) > 0
            ? names[d.index]
            : ""
        )
    )
    .call((g) =>
      g.append("title").text(
        (d) => `${names[d.index]}
gifted ${formatValue(d3.sum(matrix[d.index]))}
was gifted ${formatValue(d3.sum(matrix, (row) => row[d.index]))}`
      )
    );

  d3.select("body")
    .node()
    .append(svg.style("opacity", 0).transition().style("opacity", 1).node());
})();

d3.select("body").transition().style("background-color", "black");
