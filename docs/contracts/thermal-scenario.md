# Experimental thermal scenario v1

User-authorised extension, 3 October 2026. `/thermal-scenario` is linked from cooling options. The existing assessment, supported AC label comparison and financial brief remain unchanged.

The pure model accepts an explicit numeric parameter record and 24 hourly outdoor-temperature/solar-gain pairs. Its UI starts blank. A separately labelled synthetic example is opt-in. Values are page-local and are not derived from the decorative room or saved as known room facts. Editing any input invalidates displayed results immediately.

Single-zone balance: C dT/dt = H(Tout − T) + Qsolar + Qinternal − Qcool. H = fabric UA + 1.2 kg/m³ × 1006 J/(kg K) × volume × ACH / 3600. Effective capacity is supplied in MJ/K. Constant inputs are integrated analytically every five minutes. Hourly samples include the starting state; peaks include each five-minute endpoint.

Baseline and changed cases each run independently with and without cooling. Shading scales transmitted solar gains; insulation scales fabric UA only. Night ventilation increases ACH from 20:00 to 07:00 only when outdoors is cooler than the current case's indoor temperature. A fixed-COP ideal modulating AC operates all day, limited to supplied thermal capacity. Electricity is thermal cooling energy / COP. Cost is electricity × flat tariff. Unmet setpoint hours count five-minute endpoints more than 0.1°C above setpoint.

No humidity, radiant comfort, interzone transfer, explicit surfaces, roof solar absorption, wind/CFD, fan cooling, weather retrieval, warm-up, cycling losses, installation costs, annualisation or payback. Changed ventilation assumes natural ventilation without electricity consumption. Windows opening may be infeasible due to safety, noise or outdoor air quality. Effective capacity and conductance require measurement/engineering estimates. Intervention percentages are assumptions, not inferred product effects. This is an uncalibrated what-if tool, not a validated prediction for the user's building.

References: [EnergyPlus zone heat balance](https://energyplus.readthedocs.io/en/latest/guides/engineering-reference/2.1-basis-for-the-zone-and-air-system-integration.html), [Your Home passive cooling](https://www.yourhome.gov.au/passive-design/passive-cooling). The app does not execute EnergyPlus.

Tests cover equilibrium, analytical decay, identical scenarios, no cooling, capacity/energy bounds, shading-only sensitivity, warm-outdoor ventilation gating and invalid inputs. These are implementation checks, not empirical validation.
