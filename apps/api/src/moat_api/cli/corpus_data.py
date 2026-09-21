"""Development corpus.

Fictional publications written for this repository. The identifiers follow real
formats but refer to no actual patent, and the seeder stamps every row with
source='fixture' so nothing here can be mistaken for imported art.
"""

from __future__ import annotations

from datetime import date

PUBLICATIONS: list[dict] = [
    {
        "publication_id": "US-2021/0184392-A1",
        "title": "Compliant actuator control for human-collaborative manipulators",
        "applicant": "Helix Automation GmbH",
        "jurisdiction": "US",
        "kind_code": "A1",
        "published_on": date(2021, 6, 17),
        "classifications": ["B25J 9/16", "B25J 19/06"],
        "abstract": (
            "A controller adjusts joint stiffness in response to an estimated external force. "
            "The estimate derives from motor current rather than a dedicated torque sensor, "
            "allowing compliant behaviour on manipulators without added instrumentation."
        ),
        "claims_text": (
            "A control method comprising estimating an external force from motor current and "
            "varying a joint stiffness setpoint in dependence on the estimated external force."
        ),
    },
    {
        "publication_id": "EP-3892415-B1",
        "title": "Safety supervision method for collaborative robot cells",
        "applicant": "Meridian Robotics AB",
        "jurisdiction": "EP",
        "kind_code": "B1",
        "published_on": date(2023, 2, 8),
        "classifications": ["B25J 19/06", "F16P 3/14"],
        "abstract": (
            "Upon detecting an operator within a first zone, a supervisory unit reduces the "
            "permissible velocity and stiffness setpoints of the manipulator. Zone occupancy "
            "is determined by a time-of-flight sensor array mounted above the cell."
        ),
        "claims_text": (
            "A supervision method wherein operator proximity gating reduces permissible joint "
            "stiffness and velocity limits of an articulated arm."
        ),
    },
    {
        "publication_id": "US-11724392-B2",
        "title": "Current-based external force estimation in geared servo drives",
        "applicant": "Kestrel Drive Systems Inc.",
        "jurisdiction": "US",
        "kind_code": "B2",
        "published_on": date(2023, 8, 15),
        "classifications": ["G05B 13/04", "B25J 9/16"],
        "abstract": (
            "A friction model compensates a measured current signal to produce an external "
            "force estimate with bounded error across the operating temperature range of the "
            "drive. Temperature is read from a winding thermistor already present for "
            "protection purposes."
        ),
        "claims_text": (
            "Estimating external force from motor current using a friction model parameterised "
            "by winding temperature obtained from a thermistor."
        ),
    },
    {
        "publication_id": "JP-2022-514038-A",
        "title": "Joint stiffness scheduling for articulated arms",
        "applicant": "Sanko Heavy Industries",
        "jurisdiction": "JP",
        "kind_code": "A",
        "published_on": date(2022, 3, 4),
        "classifications": ["B25J 9/16"],
        "abstract": (
            "Stiffness values are selected from a lookup table indexed by task phase. The table "
            "is fixed at commissioning time and does not vary during operation."
        ),
        "claims_text": (
            "A method of scheduling joint stiffness of an articulated arm from a commissioning "
            "time lookup table indexed by task phase."
        ),
    },
    {
        "publication_id": "US-2024/0110883-A1",
        "title": "Thermal derating of drive torque limits in industrial actuators",
        "applicant": "Brightpath Motion Systems",
        "jurisdiction": "US",
        "kind_code": "A1",
        "published_on": date(2024, 4, 4),
        "classifications": ["H02P 29/60", "B25J 9/16"],
        "abstract": (
            "Permissible torque is reduced as winding temperature rises toward a protective "
            "threshold, so that the drive degrades smoothly rather than tripping a fault. The "
            "derating curve is applied per axis."
        ),
        "claims_text": (
            "Reducing a permissible torque limit of an actuator as a function of measured "
            "winding temperature, per axis, prior to reaching a fault condition."
        ),
    },
    {
        "publication_id": "US-11380101-B2",
        "title": "Sparse attention computation for constrained inference hardware",
        "applicant": "Pallas Semiconductor Corp.",
        "jurisdiction": "US",
        "kind_code": "B2",
        "published_on": date(2022, 7, 5),
        "classifications": ["G06N 3/0464", "G06F 9/50"],
        "abstract": (
            "Attention heads are pruned according to a contribution score computed during "
            "calibration, reducing memory bandwidth on edge accelerators while holding an "
            "accuracy target."
        ),
        "claims_text": (
            "Selectively disabling attention heads of a transformer model based on a "
            "contribution score, wherein the score is computed during a calibration pass."
        ),
    },
    {
        "publication_id": "EP-4012613-A1",
        "title": "Runtime eviction of neural network components under memory pressure",
        "applicant": "Northlight AI Ltd.",
        "jurisdiction": "EP",
        "kind_code": "A1",
        "published_on": date(2022, 6, 15),
        "classifications": ["G06N 3/063"],
        "abstract": (
            "Model components are evicted at inference time when available memory falls below "
            "a threshold, allowing a latency budget to be held on constrained hardware at a "
            "graceful accuracy cost."
        ),
        "claims_text": (
            "Evicting model components at inference time responsive to measured memory "
            "pressure so as to hold a latency budget."
        ),
    },
    {
        "publication_id": "US-2023/0298312-A1",
        "title": "Stereo baseline calibration using observed scene geometry",
        "applicant": "Cartwright Vision Systems",
        "jurisdiction": "US",
        "kind_code": "A1",
        "published_on": date(2023, 9, 21),
        "classifications": ["G06T 7/80", "H04N 13/246"],
        "abstract": (
            "A stereo rig re-estimates its baseline from observed scene geometry during normal "
            "operation, removing the need for a scheduled calibration target procedure."
        ),
        "claims_text": (
            "Re-estimating a stereo baseline during operation from observed scene geometry "
            "without presentation of a calibration target."
        ),
    },
    {
        "publication_id": "US-10998741-B2",
        "title": "Weld seam tracking using structured light",
        "applicant": "Ironbridge Welding Technologies",
        "jurisdiction": "US",
        "kind_code": "B2",
        "published_on": date(2021, 5, 4),
        "classifications": ["B23K 9/127", "G06T 7/73"],
        "abstract": (
            "A structured light projector and camera track a weld seam in real time, adjusting "
            "torch position to follow deviations in the joint path."
        ),
        "claims_text": (
            "Tracking a weld seam with structured light and adjusting torch position responsive "
            "to detected deviation of the joint path."
        ),
    },
    {
        "publication_id": "CN-114792231-A",
        "title": "Battery pack balancing based on predicted cell temperature",
        "applicant": "Hangzhou Yuanli Energy Co.",
        "jurisdiction": "CN",
        "kind_code": "A",
        "published_on": date(2022, 7, 22),
        "classifications": ["H01M 10/48", "H02J 7/00"],
        "abstract": (
            "Balancing current is allocated among cells according to a predicted temperature "
            "rather than voltage difference alone, reducing degradation under deep discharge "
            "duty cycles."
        ),
        "claims_text": (
            "Allocating balancing current among battery cells in dependence on a predicted "
            "cell temperature."
        ),
    },
    {
        "publication_id": "US-2022/0344733-A1",
        "title": "Voltage-delta cell balancing controller",
        "applicant": "Corvus Power Inc.",
        "jurisdiction": "US",
        "kind_code": "A1",
        "published_on": date(2022, 10, 27),
        "classifications": ["H02J 7/00"],
        "abstract": (
            "A controller equalises cell voltages by shunting current from cells whose voltage "
            "exceeds the pack mean by a configured delta."
        ),
        "claims_text": (
            "Balancing battery cells by shunting current from cells exceeding a mean pack "
            "voltage by a configured delta."
        ),
    },
    {
        "publication_id": "EP-3771094-B1",
        "title": "Haptic rendering of motion boundaries on a handheld controller",
        "applicant": "Vestra Interfaces Oy",
        "jurisdiction": "EP",
        "kind_code": "B1",
        "published_on": date(2021, 11, 10),
        "classifications": ["G06F 3/01", "B25J 13/02"],
        "abstract": (
            "A handheld controller renders a configured motion boundary as increasing force "
            "feedback, so an operator perceives the limit before reaching it."
        ),
        "claims_text": (
            "Rendering a configured motion boundary as force feedback on a handheld controller "
            "proportional to proximity to the boundary."
        ),
    },
    {
        "publication_id": "US-11556119-B2",
        "title": "Teach pendant with proximity-aware jogging limits",
        "applicant": "Arcadia Controls LLC",
        "jurisdiction": "US",
        "kind_code": "B2",
        "published_on": date(2023, 1, 17),
        "classifications": ["B25J 13/06"],
        "abstract": (
            "Jog velocity is limited according to distance between the tool centre point and a "
            "configured safety boundary, with an abrupt stop when the boundary is reached."
        ),
        "claims_text": (
            "Limiting jog velocity of a manipulator in dependence on distance to a configured "
            "safety boundary."
        ),
    },
    {
        "publication_id": "US-2020/0311542-A1",
        "title": "Adaptive impedance control with variable damping for contact tasks",
        "applicant": "Tessellate Robotics Inc.",
        "jurisdiction": "US",
        "kind_code": "A1",
        "published_on": date(2020, 10, 1),
        "classifications": ["B25J 9/16", "G05B 13/02"],
        "abstract": (
            "An impedance controller varies damping and stiffness during contact tasks "
            "according to measured contact force, improving stability on stiff environments."
        ),
        "claims_text": (
            "An adaptive impedance control method varying damping and joint stiffness during a "
            "contact task in dependence on measured contact force."
        ),
    },
    {
        "publication_id": "KR-10-2022-0098123-A",
        "title": "Winding temperature estimation without dedicated sensors",
        "applicant": "Dongbaek Precision Co.",
        "jurisdiction": "KR",
        "kind_code": "A",
        "published_on": date(2022, 7, 12),
        "classifications": ["H02P 29/64"],
        "abstract": (
            "Winding temperature is estimated from resistance change inferred during operation, "
            "avoiding a dedicated thermistor per axis."
        ),
        "claims_text": (
            "Estimating winding temperature of a motor from an inferred resistance change "
            "during operation."
        ),
    },
    {
        "publication_id": "US-2025/0043118-A1",
        "title": "Continuous re-derivation of robot safety envelopes",
        "applicant": "Lattice Safety Systems",
        "jurisdiction": "US",
        "kind_code": "A1",
        "published_on": date(2025, 2, 6),
        "classifications": ["B25J 9/16", "F16P 3/14"],
        "abstract": (
            "A safety envelope is re-derived at control rate from current machine state rather "
            "than selected from a fixed table, so permissible motion adapts continuously."
        ),
        "claims_text": (
            "Re-deriving a permissible motion envelope of a machine at control rate from "
            "current machine state."
        ),
    },
    {
        "publication_id": "EP-4155850-A1",
        "title": "Photonic waveguide alignment using thermal tuning",
        "applicant": "Vantage Photonics Ltd.",
        "jurisdiction": "EP",
        "kind_code": "A1",
        "published_on": date(2023, 3, 29),
        "classifications": ["G02B 6/12"],
        "abstract": (
            "Waveguide coupling is aligned by thermally tuning a resonator, compensating "
            "fabrication tolerance without mechanical adjustment."
        ),
        "claims_text": (
            "Aligning optical coupling of a waveguide by thermal tuning of a resonator to "
            "compensate fabrication tolerance."
        ),
    },
    {
        "publication_id": "US-11892681-B2",
        "title": "Wavelength locking for silicon photonic transceivers",
        "applicant": "Halcyon Optical Networks",
        "jurisdiction": "US",
        "kind_code": "B2",
        "published_on": date(2024, 2, 6),
        "classifications": ["G02B 6/293", "H04B 10/50"],
        "abstract": (
            "A control loop locks transmitter wavelength against a reference resonator, "
            "maintaining channel spacing across temperature."
        ),
        "claims_text": (
            "Locking a transmitter wavelength to a reference resonator to maintain channel "
            "spacing across an operating temperature range."
        ),
    },
    {
        "publication_id": "US-2023/0089122-A1",
        "title": "Optical phase array steering without moving parts",
        "applicant": "Vantage Photonics Ltd.",
        "jurisdiction": "US",
        "kind_code": "A1",
        "published_on": date(2023, 3, 23),
        "classifications": ["G02F 1/295"],
        "abstract": (
            "Beam direction is steered by controlling relative phase across an emitter array, "
            "removing mechanical scanning elements from the optical path."
        ),
        "claims_text": (
            "Steering an optical beam by controlling relative phase across an array of emitters "
            "without mechanical movement."
        ),
    },
    {
        "publication_id": "EP-3998512-B1",
        "title": "Thermal crosstalk compensation in dense photonic circuits",
        "applicant": "Aurelia Integrated Optics",
        "jurisdiction": "EP",
        "kind_code": "B1",
        "published_on": date(2024, 6, 12),
        "classifications": ["G02B 6/12", "G02F 1/01"],
        "abstract": (
            "Heater drive signals are corrected for thermal crosstalk between adjacent tuning "
            "elements, improving channel isolation in densely integrated circuits."
        ),
        "claims_text": (
            "Compensating thermal crosstalk between adjacent heaters of a photonic integrated "
            "circuit by correcting heater drive signals."
        ),
    },
]
