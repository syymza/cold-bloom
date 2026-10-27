# Model, attribution and limits

Cold Bloom implements Clifford A. Reiter's local cellular model from *A Local Cellular Model for Snow Crystal Growth*, Chaos, Solitons & Fractals 23 (2005), 1111-1119. The [primary preprint](https://webbox.lafayette.edu/~reiterc/mvp/sfn/sfn_pp.pdf) describes the rule on pages 4-5, diffusion on page 7, and changing conditions on page 8. See also the author's [auxiliary material and parameter gallery](https://webbox.lafayette.edu/~reiterc/mvp/sfn/index.html). No source code, gallery images or prerecorded forms are embedded here.

## Numerical rule

The two-dimensional axial hexagonal lattice has six nearest neighbors. Each site stores one nonnegative real-valued water amount `m`. Values at least one are ice. A site is receptive if it is ice or has an ice neighbor.

At the start of each synchronous iteration, split the field into retained mass `s` at receptive sites and free mass `d` elsewhere. Set free mass to zero at receptive sites. The update is:

```
m_next = s + gamma * receptive + 0.5*d + sum(d_neighbors)/12
```

These are the paper's standard diffusion weights, equivalent to alpha = 1. Deposition gamma is added to **every receptive site, including existing ice**, not just advancing tips. The uniform initial background is beta, with a single seed of value one.

The reservoir follows Euclidean distance: `q*q + q*r + r*r <= radius*radius`. The discrete outer ring consists of sites with a neighbor outside that disk and remains fixed at beta. Radius is 120 lattice units. Ice extent is also measured in Euclidean distance. The core detects growth at or beyond radius 115 every eight iterations, or stops at 18,000 iterations. A boundary check can slightly overshoot its stopping radius. This is a finite discretization of the paper's circular-reservoir intention, not a continuous circular boundary.

Six rotationally equivalent sites share one Float64 value. This preserves exact sixfold symmetry for the uniform seed and conditions used here; asymmetric seed experiments are outside this interface. The full disk contains 52,219 sites represented by 8,704 rotational classes. Thresholds, local diffusion and deposition remain numerical approximations, not molecular thermodynamics.

## Controls and scientific interpretation

- **Vapour supply** is beta, the background water level, limited here to 0.32-0.72.
- **Deposition** is gamma, the constant added at receptive sites. Slider position `v` maps to `0.0008 * 10 ** ((v - 38) / 100 * 2.3)`, about 0.000107-0.0213.
- Defaults remain beta 0.45 and gamma 0.0008. This interface offers a curated subset of the paper's wider parameter exploration.

Neither slider is a calibrated temperature or humidity measurement. Reiter's paper aims at qualitative two-dimensional growth patterns rather than fitted physical equations. Gamma loosely represents an additional source of water, including supply from outside the growth plane; it is not a measured kinetic attachment coefficient. Fixed boundary supply and deposition introduce mass, so the complete system is not closed or mass conserving. There is no heat field, airflow, sublimation model or three-dimensional ice structure.

Each new seed captures both settings once. Slider changes wait for the next seed; the current crystal retains its parameters. Each displayed crystal has its own independent field, with no shared vapor or flux. The core's optional `configure` method now follows the paper's proportional free-field rescaling for a background change, leaving retained mass intact. Rescaling from a zero background to a positive one is undefined and requires a new seed; the UI never makes such a change.

## Artistic presentation and bounded lifecycle

The scene arranges independent simulations; the crystals do not physically coexist in a common chamber. Display positions, sizes, illumination and age opacity are compositional choices. Color uses accumulated mass, clipped only for drawing; it is not measured thickness or calculated refraction. Older crystals fade visually rather than physically melting.

One reused worker advances eight iterations per normal request, with a 24 ms baseline and 35 ms per outward lattice unit after extent eight. A settled crystal rests for one second. Once five are visible, the oldest fades for three seconds before the next seed begins, maintaining a strict five-entry cap. Wide displays rotate through six seats; narrow displays use a balanced five-seat composition.

The composition also settles a crystal at the first returned batch reaching 3,200 iterations. This explicit display cutoff keeps sparse settings from occupying a seat for several minutes; it is not equilibrium or a change to the local update. The paper also uses finite stopping conditions, but this particular cutoff and cadence belong to Cold Bloom.

Caches are capped at 640 square pixels per side and display DPR at two. Hidden documents suspend scheduling and retirement timing without catch-up. Reduced-motion mode presents completed stills without animated partial growth or fades, using bounded 12-step requests and a 14-second still interval. Hardware and conditions affect wall-clock pace.

## Reference-based checks and regression fixture

`tests/reference.test.mjs` checks the **published Figure 2 interior values**, rounded to the paper's three decimal places, using its displayed local patch. It also checks analytically derived one-step weights, the paper's zero-supply/no-deposition case, deposition-only plate growth, fixed circular reservoir values, proportional background rescaling, and diffusion mass conservation before a disturbance reaches the reservoir. These local checks do not establish calibrated physical accuracy or reproduce a published full-crystal image.

Separately, `tests/model.test.mjs` checks a radius-120 seed with beta 0.45 and gamma 0.0008 after 800 iterations. Extent is 54. SHA-256 of the little-endian Float32 ice buffer, ordered by q then r with triples `(q,r,min(4,m))`:

```
2b18d0bbec20c123517dd8c3d1f75fc1471343869ea5cadcb13ea278f0677e31
```

That full-crystal fixture is **internal regression evidence**, not an independently published reference pattern. Its hash remained unchanged after the reservoir correction at this early growth stage. The paper's gallery remains a qualitative comparison; stopping radius, parameter choices and rendering must be matched before claiming a full-pattern reproduction.
