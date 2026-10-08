export function initializeGlobe() {
  const globeSvg = d3.select("#globeSvg");
  const gW = 1000, gH = 700;

  const globeProjection = d3.geoOrthographic()
    .scale(280)
    .translate([gW / 2, gH / 2])
    .rotate([-51.5, -55.2])
    .clipAngle(90);

  const globePath = d3.geoPath().projection(globeProjection);

  globeSvg.append("circle")
    .attr("class", "globe-sphere")
    .attr("cx", gW / 2).attr("cy", gH / 2).attr("r", 280);

  let autoRotate = true;
  let rotation = [-51.5, -55.2];
  const rotateSpeed = 0.08;

  const ready = d3.json("countries-110m.json").then(world => {
    const countries = topojson.feature(world, world.objects.countries);
    globeSvg.selectAll("path.country")
      .data(countries.features)
      .enter()
      .append("path")
      .attr("class", "country")
      .attr("d", globePath);
    console.log("✓ Глобус загружен");
  });

  function rotateGlobe() {
    if (!autoRotate) return;
    rotation[0] += rotateSpeed;
    globeProjection.rotate(rotation);
    globeSvg.selectAll("path.country").attr("d", globePath);
    requestAnimationFrame(rotateGlobe);
  }
  rotateGlobe();

  function approach() {
    autoRotate = false;
    const targetRot = [-51.5, -55.2];
    const startRot = [...rotation];

    return d3.transition()
      .duration(1200)
      .ease(d3.easeCubicInOut)
      .tween("rotate", () => {
        const i0 = d3.interpolate(startRot[0], targetRot[0]);
        const i1 = d3.interpolate(startRot[1], targetRot[1]);
        return t => {
          rotation[0] = i0(t);
          rotation[1] = i1(t);
          globeProjection.rotate(rotation);
          globeSvg.selectAll("path.country").attr("d", globePath);
        };
      })
      .transition()
      .duration(1400)
      .ease(d3.easeCubicIn)
      .tween("zoom", () => {
        const iScale = d3.interpolate(280, 2400);
        return t => {
          const s = iScale(t);
          globeProjection.scale(s);
          globeSvg.select(".globe-sphere").attr("r", s);
          globeSvg.selectAll("path.country").attr("d", globePath);
        };
      })
      .end();
  }

  return { ready, approach };
}
