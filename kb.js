/* Offline knowledge base for Virtual Bio-Chemist.
   Summarised from the GROMACS reference manual / user guide (2023-2024 series).
   Always confirm details for your installed version: gmx help <command> or https://manual.gromacs.org
   Code blocks in this file use ~~~ fences. */
const R = String.raw;

window.KB = {
commands: [
{name:'pdb2gmx', keys:['pdb2gmx','topology','force field','forcefield','protonation','ignh'], text:R`**gmx pdb2gmx** converts a .pdb into a .gro and a topology (.top) plus position restraints (posre.itp).
~~~
gmx pdb2gmx -f protein.pdb -o processed.gro -p topol.top -i posre.itp -ff amber99sb-ildn -water tip3p -ignh
~~~
Useful flags: -ignh (ignore hydrogens in the input and rebuild them), -ter (choose termini), -chainsep, -merge all, -his (choose histidine protonation), -lys, -asp, -glu, -missing (only for testing, not for production), -vsite hydrogens (4 fs time step).
Add -ff and -water to skip the interactive menus.`},
{name:'editconf', keys:['editconf','box','center','dodecahedron','cubic','octahedron'], text:R`**gmx editconf** edits box, centers a molecule, converts formats.
~~~
gmx editconf -f processed.gro -o newbox.gro -c -d 1.0 -bt dodecahedron
~~~
-c center in box, -d distance from solute to box edge (nm), -bt cubic|dodecahedron|octahedron|triclinic, -box x y z (explicit), -angles, -princ (align principal axes), -rotate, -translate, -label, -n (write index file).
Dodecahedron needs about 29% less volume than a cube for the same minimum image distance.`},
{name:'solvate', keys:['solvate','solvation','water','spc216','tip4p'], text:R`**gmx solvate** fills the box with solvent and updates the [ molecules ] section of the topology.
~~~
gmx solvate -cp newbox.gro -cs spc216.gro -o solv.gro -p topol.top
~~~
Use spc216.gro for 3-site models (SPC, SPC/E, TIP3P), tip4p.gro for TIP4P. Other options: -maxsol, -shell (solvent shell), -vdwd (van der Waals radius), -box.`},
{name:'genion', keys:['genion','ions','neutralize','neutralise','salt','charge','sodium','chloride'], text:R`**gmx genion** replaces solvent molecules by ions. Requires a .tpr made with grompp from an ions.mdp.
~~~
gmx grompp -f ions.mdp -c solv.gro -p topol.top -o ions.tpr
gmx genion -s ions.tpr -o solv_ions.gro -p topol.top -pname NA -nname CL -neutral -conc 0.15
~~~
Select the SOL group when asked (it must be a continuous solvent group). -neutral adds counter-ions to neutralize; -conc sets salt concentration (M); -np/-nn fix ion counts. For CHARMM use NA/CL; older force fields may use NA+/CL-.`},
{name:'grompp', keys:['grompp','preprocess','tpr','maxwarn','mdp','define'], text:R`**gmx grompp** reads .mdp + coordinates + topology (+ index) and writes the binary run input .tpr.
~~~
gmx grompp -f md.mdp -c npt.gro -t npt.cpt -r npt.gro -p topol.top -n index.ndx -o md.tpr
~~~
-f mdp, -c structure, -r reference coordinates for position restraints, -t checkpoint (exact continuation incl. velocities), -p topology, -n index, -o tpr, -po mdout.mdp (all parameters actually used), -maxwarn N (override warnings; use only if you understand each one), -pp processed topology, -renum.
Notes about the mdp are printed here; read them.`},
{name:'mdrun', keys:['mdrun','run','gpu','threads','restart','continue','checkpoint','cpi','performance','deffnm','maxh'], text:R`**gmx mdrun** performs the simulation (also energy minimization, rerun, etc.).
~~~
gmx mdrun -deffnm md -v
gmx mdrun -deffnm md -ntmpi 1 -ntomp 8 -nb gpu -pme gpu -bonded gpu -update gpu
gmx mdrun -deffnm md -cpi md.cpt -append        # continue after a crash or time limit
~~~
-deffnm sets the base name of all files. -s tpr, -o trr, -x xtc, -c final gro, -e edr, -g log, -cpi/-cpo checkpoint, -cpt minutes between checkpoints (default 15), -maxh stop gracefully after N hours, -nt total threads, -ntmpi thread-MPI ranks, -ntomp OpenMP threads per rank, -nb/-pme/-bonded/-update cpu|gpu, -gpu_id, -pin on, -dlb yes|auto|no, -rerun traj, -nsteps override, -noappend, -v verbose.
For MPI builds the binary is gmx_mpi; run it with mpirun -np N gmx_mpi mdrun ...`},
{name:'trjconv', keys:['trjconv','trajectory convert','convert trajectory','extract frames','skip','dt','timestamp','fit','nojump','center'], text:R`**gmx trjconv** converts, trims, centers and corrects PBC in trajectories.
~~~
gmx trjconv -s md.tpr -f md.xtc -o md_center.xtc -pbc mol -center       # groups: Protein, System
gmx trjconv -s md.tpr -f md_center.xtc -o md_fit.xtc -fit rot+trans     # fit group, output group
gmx trjconv -s md.tpr -f md.xtc -o frame.pdb -dump 5000                 # frame at 5000 ps
gmx trjconv -s md.tpr -f md.xtc -o md_10ps.xtc -dt 10 -b 1000 -e 5000   # subsample / cut
~~~
-pbc none|mol|res|atom|nojump|cluster|whole, -ur rect|tric|compact, -center, -fit none|rot+trans|rotxy+transxy|translation|progressive, -n index, -b/-e (ps), -dt (ps), -skip n, -dump t, -sep (one file per frame), -conect.`},
{name:'trjcat', keys:['trjcat','concatenate','join trajectories','merge trajectories'], text:R`**gmx trjcat** concatenates trajectory files.
~~~
gmx trjcat -f part1.xtc part2.xtc -o all.xtc -settime
~~~
-settime asks for start times, -cat concatenates without removing overlapping frames.`},
{name:'eneconv', keys:['eneconv','merge edr','join edr','concatenate edr'], text:R`**gmx eneconv** concatenates or converts energy files.
~~~
gmx eneconv -f md1.edr md2.edr -o md_all.edr
~~~`},
{name:'convert-tpr', keys:['convert-tpr','extend','extend simulation','longer','more time','new nsteps'], text:R`**gmx convert-tpr** modifies a .tpr, for example to extend a run.
~~~
gmx convert-tpr -s md.tpr -extend 10000 -o md_ext.tpr      # add 10000 ps
gmx mdrun -s md_ext.tpr -cpi md.cpt -deffnm md              # continue
~~~
Other flags: -until (absolute end time, ps), -nsteps, -n (new index to remove groups).`},
{name:'make_ndx', keys:['make_ndx','index','ndx','groups','index group'], text:R`**gmx make_ndx** creates index groups.
~~~
gmx make_ndx -f md.gro -o index.ndx
~~~
Interactive commands: 'q' quit, 'r 1-50' residues 1-50, 'a CA' atoms named CA, 'name 18 MyGroup', '1 | 13' union of groups, '1 & !a H*' intersection with negation, 'splitres', 'del 5'. Non-interactive: echo -e "r 1-50\nname 18 Active\nq" | gmx make_ndx -f md.gro -o index.ndx.`},
{name:'genrestr', keys:['genrestr','position restraint','position restraints','posres','restraints'], text:R`**gmx genrestr** writes position-restraint include files for chosen groups.
~~~
gmx genrestr -f processed.gro -n index.ndx -o posre_bb.itp -fc 1000 1000 1000
~~~
In the topology: #ifdef POSRES_BB / #include "posre_bb.itp" / #endif, then set define = -DPOSRES_BB in the mdp. Use -r in grompp with the reference structure (usually the previous step's output). Default pdb2gmx posre.itp is switched on by define = -DPOSRES.`},
{name:'energy', keys:['energy','edr','potential','temperature','pressure','density','box volume','gmx energy'], text:R`**gmx energy** extracts terms from an .edr.
~~~
printf "Potential\n0\n" | gmx energy -f em.edr -o potential.xvg
printf "Temperature\n0\n" | gmx energy -f nvt.edr -o temperature.xvg
printf "Pressure\n0\n" | gmx energy -f npt.edr -o pressure.xvg
printf "Density\n0\n" | gmx energy -f npt.edr -o density.xvg
~~~
Terms can be given by name or number. -b/-e (ps), -fee (free energy estimate), -driftcorr, -sum, -nmol, -xvg none|xmgrace|xmgr. Prints average, RMSD, error estimate and drift.`},
{name:'rms', keys:['rms','rmsd','root mean square deviation','deviation'], text:R`**gmx rms** computes RMSD after least-squares fitting.
~~~
printf "Backbone\nBackbone\n" | gmx rms -s md.tpr -f md_fit.xtc -o rmsd.xvg -tu ns
~~~
First group: fit; second group: RMSD calculation. -s reference structure (tpr/gro/pdb), -m matrix (2D RMSD), -dist, -bin, -what rmsd|rho|rhosc, -nofit. Compare to the first frame (tpr is the minimized/initial structure) or to the crystal structure.`},
{name:'rmsf', keys:['rmsf','fluctuation','b-factor','bfactor','flexibility'], text:R`**gmx rmsf** gives per-atom or per-residue root mean square fluctuation.
~~~
printf "C-alpha\n" | gmx rmsf -s md.tpr -f md_fit.xtc -o rmsf.xvg -res
printf "Protein\n" | gmx rmsf -s md.tpr -f md_fit.xtc -oq bfac.pdb -ox avg.pdb -res
~~~
-res averages per residue, -oq writes B-factors in a pdb, -ox average structure, -od covariance diagonal.`},
{name:'gyrate', keys:['gyrate','radius of gyration','rg','compactness','folding'], text:R`**gmx gyrate** computes the radius of gyration (also its x/y/z components).
~~~
printf "Protein\n" | gmx gyrate -s md.tpr -f md_fit.xtc -o gyrate.xvg
~~~`},
{name:'hbond', keys:['hbond','hydrogen bond','hydrogen bonds','h-bond','hbonds'], text:R`**gmx hbond** counts hydrogen bonds (rewritten in GROMACS 2021+ for speed).
~~~
printf "Protein\nProtein\n" | gmx hbond -s md.tpr -f md_fit.xtc -num hbnum.xvg
printf "Protein\nSOL\n"     | gmx hbond -s md.tpr -f md_fit.xtc -num hb_water.xvg
~~~
Geometric criteria: donor-acceptor distance <= 0.35 nm and hydrogen-donor-acceptor angle <= 30 degrees (-r, -a to change). -hbn writes an index, -hbm existence map, -dist, -ang distributions, -ac autocorrelation (lifetimes).`},
{name:'sasa', keys:['sasa','solvent accessible','surface area','accessible surface'], text:R`**gmx sasa** computes the solvent accessible surface area.
~~~
printf "Protein\n" | gmx sasa -s md.tpr -f md_fit.xtc -o sasa.xvg -or resarea.xvg -tu ns
~~~
-probe radius (default 0.14 nm), -ndots, -odg dg-solv, -surface and -output for selections (see gmx help selections).`},
{name:'dssp', keys:['dssp','secondary structure','helix','sheet','do_dssp'], text:R`**gmx dssp** (GROMACS 2023+) calculates secondary structure per frame; older versions use do_dssp (needs an external dssp binary).
~~~
printf "Protein\n" | gmx dssp -s md.tpr -f md_fit.xtc -o dssp.dat -num dssp_num.xvg
# older:  gmx do_dssp -s md.tpr -f md_fit.xtc -o ss.xpm -sc scount.xvg
~~~
-hmode gromacs|dssp, -hbond energy|geometry, -clear, -camelcase. Convert xpm to image with gmx xpm2ps.`},
{name:'cluster', keys:['cluster','clustering','conformations','representative structure'], text:R`**gmx cluster** groups structures by RMSD.
~~~
printf "Backbone\nProtein\n" | gmx cluster -s md.tpr -f md_fit.xtc -method gromos -cutoff 0.15 -cl clusters.pdb -g cluster.log -dt 10
~~~
Methods: linkage, jarvis-patrick, monte-carlo, diagonalization, gromos. Outputs: -cl central structures, -o rmsd-clust.xpm, -clid cluster id over time, -sz sizes.`},
{name:'covar', keys:['covar','pca','principal component','essential dynamics','covariance','anaeig'], text:R`**gmx covar** + **gmx anaeig** perform principal component analysis.
~~~
printf "Backbone\nBackbone\n" | gmx covar -s md.tpr -f md_fit.xtc -o eigenval.xvg -v eigenvec.trr -av average.pdb
printf "Backbone\nBackbone\n" | gmx anaeig -s md.tpr -f md_fit.xtc -v eigenvec.trr -eig eigenval.xvg -proj proj.xvg -first 1 -last 2 -2d 2dproj.xvg
~~~
-extr writes extreme projections on an eigenvector, -filt filtered trajectory.`},
{name:'distance', keys:['distance','mindist','contact','contacts','distances','angle','dihedral','gangle','chi','rama','ramachandran'], text:R`**Distances, contacts, angles**
~~~
gmx distance -s md.tpr -f md_fit.xtc -select 'resnr 10 and name CA plus resnr 50 and name CA' -oav dist.xvg
gmx mindist  -s md.tpr -f md_fit.xtc -od mindist.xvg -pi          # periodic images (check minimum image convention)
gmx mindist  -s md.tpr -f md_fit.xtc -n index.ndx -od mind.xvg -on numcont.xvg -d 0.6
gmx angle    -f md.xtc -n angle.ndx -ov angle.xvg -type dihedral
gmx chi      -s md.tpr -f md.xtc -phi -psi -rama                    # Ramachandran/rotamers
gmx rama     -s md.tpr -f md.xtc -o rama.xvg
~~~
Selections: gmx help selections.`},
{name:'rdf', keys:['rdf','radial distribution','coordination','solvation shell'], text:R`**gmx rdf** radial distribution function.
~~~
printf "Protein\nSOL\n" | gmx rdf -s md.tpr -f md_fit.xtc -o rdf.xvg -cn rdf_cn.xvg -bin 0.01
~~~
-ref/-sel with selections, -cut, -rmax, -pbc, -surf mol|res for surface-based RDF.`},
{name:'msd', keys:['msd','diffusion','mean square displacement','diffusion coefficient'], text:R`**gmx msd** mean square displacement and diffusion coefficient.
~~~
printf "SOL\n" | gmx msd -s md.tpr -f md.xtc -o msd.xvg -mol diff_mol.xvg -trestart 10 -beginfit 100 -endfit 1000
~~~
Use an unwrapped trajectory (nojump) and a long, well-equilibrated production run. Finite-size correction (Yeh-Hummer) is not included.`},
{name:'density', keys:['density profile','membrane density','gmx density'], text:R`**gmx density** computes density profiles along an axis (e.g. membrane normal).
~~~
gmx density -s md.tpr -f md.xtc -d Z -sl 100 -o density_profile.xvg
~~~`},
{name:'traj', keys:['traj','coordinates over time','com','center of mass','velocity'], text:R`**gmx traj** extracts coordinates, velocities, forces or centers of mass.
~~~
gmx traj -s md.tpr -f md.xtc -n index.ndx -com -ox com.xvg
~~~`},
{name:'check', keys:['check','inspect','check trajectory','check energy file','dump','gmxdump','tpr content'], text:R`**gmx check** summarizes a trajectory, tpr or edr (frame count, time range, box); **gmx dump** prints all content of a tpr/trr/edr/mdp-ish file.
~~~
gmx check -f md.xtc
gmx check -e md.edr
gmx dump -s md.tpr | less
~~~`},
{name:'select', keys:['select','selection','selections','atom selection'], text:R`**Selections** (used by distance, sasa, rdf, rmsf-like tools via -select): examples
~~~
'resname LIG'
'protein and not name "H*"'
'within 0.5 of resname LIG'
'resnr 1 to 50 and name CA'
'(resname SOL and same residue as within 0.35 of group Protein)'
~~~
Full syntax: gmx help selections.`},
{name:'insert-molecules', keys:['insert-molecules','insert','add molecules','ligand placement','lipids','pack'], text:R`**gmx insert-molecules** inserts copies of molecules into a box or around a solute.
~~~
gmx insert-molecules -f box.gro -ci ligand.gro -nmol 10 -o box_lig.gro -try 100 -radius 0.3
~~~
Remember to add the molecule and count to [ molecules ] in the topology.`},
{name:'xpm2ps', keys:['xpm2ps','xpm','plot matrix','image from xpm'], text:R`**gmx xpm2ps** converts .xpm matrices (DSSP, RMSD matrix, H-bond map) to PostScript.
~~~
gmx xpm2ps -f rmsd-clust.xpm -o rmsd-clust.eps -rainbow blue
~~~`},
{name:'bar', keys:['bar','free energy','fep','bennett','alchemical','wham','pull','umbrella','pmf'], text:R`**Free-energy tools**: gmx bar (Bennett acceptance ratio from dhdl.xvg/edr), gmx wham (umbrella sampling PMF), pull code via mdp (pull = yes).
~~~
gmx bar -f lambda_*/dhdl.xvg -o bar.xvg -oi barint.xvg
gmx wham -it tpr-files.dat -if pullf-files.dat -o profile.xvg -hist histo.xvg -unit kJ
~~~
Alchemical settings in mdp: free-energy = yes, init-lambda-state, vdw-lambdas, coul-lambdas, couple-moltype, couple-lambda0/1, sc-alpha, sc-power, nstdhdl.`},
{name:'tune_pme', keys:['tune_pme','optimize','speed','ns/day','benchmark','pme tuning','load balance'], text:R`**Performance**: gmx tune_pme finds the best PME rank split for MPI runs. For single node runs the defaults are usually good; check md.log for the performance table. Tips: use -nb gpu -pme gpu -bonded gpu -update gpu with an NVIDIA/AMD GPU, use -pin on, pick nstlist 100 on GPU (mdrun adjusts automatically), keep 2 fs with h-bonds constraints (4 fs only with virtual-site hydrogens or heavy hydrogens, mass-repartition-factor 3 in recent versions).`},
{name:'help', keys:['gmx help','gmx -h','list commands','all commands'], text:R`List all commands with gmx help, details with gmx help <command> (e.g. gmx help grompp). Topics: gmx help selections, gmx help mdp-options (some builds), gmx help commands.
Commands by group: Generating topologies and coordinates (editconf, x2top, solvate, insert-molecules, genconf, genion, genrestr, pdb2gmx); Running a simulation (grompp, mdrun, convert-tpr); Viewing trajectories (nmtraj, view); Processing energies (energy, enemat); Converting files (editconf, eneconv, sigeps, trjcat, trjconv); Tools (analyze, dyecoupl, filter, lie, make_ndx, mk_angndx, select, sham, spatial, spol, tcaf, traj, tune_pme, vanhove, wham); Distances/angles (angle, distance, gangle, mindist, pairdist, rdf, rmsdist); Structural properties (anaeig, covar, hbond, rms, rmsf, gyrate, sasa, dssp, cluster, do_dssp, rama, chi, helix, bundle, order, density, msd, potential, current, dipoles).`}
],

mdp: [
['define','Pre-processor flags passed to the topology, e.g. -DPOSRES (position restraints from posre.itp), -DFLEXIBLE (flexible water for minimization), -DPOSRES_BB (custom).'],
['integrator','md (leap-frog), md-vv (velocity Verlet), md-vv-avek, sd (stochastic dynamics, leap-frog), bd (Brownian), steep (steepest descent minimization), cg (conjugate gradient), l-bfgs (quasi-Newton minimization), nm (normal modes), mimic.'],
['dt','Time step in ps. 0.002 with constraints = h-bonds; 0.004 only with virtual-site hydrogens or hydrogen mass repartitioning; 0.001 for flexible bonds.'],
['nsteps','Number of steps. Simulated time = nsteps * dt. For minimization it is the maximum number of steps. -1 means infinite.'],
['tinit','Starting time (ps) for the run.'],
['comm-mode','Removal of centre-of-mass motion: Linear, Angular, Linear-acceleration-correction, None. Use None with position restraints in a fixed frame or with pulling when appropriate.'],
['nstcomm','Interval (steps) for COM motion removal. Default 100.'],
['emtol','Minimization stops when max force < emtol (kJ/mol/nm). 1000 is common for starting MD; 100-10 for precise minimum or normal modes.'],
['emstep','Initial step size (nm) for minimization. Default 0.01.'],
['nstcgsteep','For cg: frequency (steps) of a steepest-descent step. Default 1000.'],
['cutoff-scheme','Verlet (only option in current GROMACS). Uses buffered pair lists with a dynamic pruning, so rlist is set automatically (verlet-buffer-tolerance).'],
['nstlist','Pair list update interval. 10 is typical, mdrun may raise it for GPU. For the Verlet scheme the buffer is automatic.'],
['verlet-buffer-tolerance','Allowed drift of pair energy per particle due to the buffer (default 0.005 kJ/mol/ps). -1 uses rlist manually.'],
['pbc','Periodic boundary conditions: xyz (standard), no, xy (with walls), screw.'],
['periodic-molecules','yes for infinite molecules across the box (polymers, crystals).'],
['coulombtype','PME (recommended, particle mesh Ewald), Reaction-Field, Cut-off, Ewald, P3M-AD, Shift, Switch, User.'],
['rcoulomb','Real-space Coulomb cutoff (nm). Must equal rvdw with PME in Verlet scheme unless force field dictates otherwise: AMBER 1.0, CHARMM 1.2, GROMOS 1.4, OPLS 1.0-1.2.'],
['fourierspacing','Grid spacing for PME (default 0.12 nm). Smaller is more accurate and slower; 0.16 is commonly used.'],
['pme-order','Interpolation order for PME. Default 4 (cubic).'],
['ewald-rtol','Relative strength of the Ewald-shifted potential at rcoulomb. Default 1e-5.'],
['epsilon-r','Relative dielectric constant (default 1). Do not change for explicit water.'],
['vdwtype','Cut-off (with vdw-modifier) or PME (LJ-PME). Switch/Shift are deprecated; use vdw-modifier instead.'],
['vdw-modifier','Potential-shift (default), Force-switch (CHARMM), Potential-switch, None. CHARMM: Force-switch with rvdw-switch 1.0 and rvdw 1.2.'],
['rvdw','Van der Waals cutoff (nm). Force-field dependent (see rcoulomb).'],
['rvdw-switch','Where force or potential switching starts (nm), e.g. 1.0 for CHARMM.'],
['DispCorr','Long-range dispersion correction: EnerPres (energy and pressure, standard for most force fields), Ener, AllEnerPres, AllEner, no. Use no for CHARMM with force-switch only if you know what you do, and for GROMOS follow its guidance.'],
['tcoupl','Thermostat: V-rescale (stochastic velocity rescaling, recommended), Nose-Hoover (use with md-vv or tau_t >= ~1 ps), Berendsen (equilibration only, avoid), andersen, andersen-massive, no.'],
['tc-grps','Groups coupled separately, e.g. Protein Non-Protein or Protein SOL_ION (use System for one group). Group names must exist in the default or supplied index file.'],
['tau-t','Coupling time constants (ps), one per tc-grps group. 0.1 for V-rescale, 1.0 for Nose-Hoover.'],
['ref-t','Reference temperatures (K), one per tc-grps group.'],
['pcoupl','Barostat: C-rescale (stochastic cell rescaling, recommended, GROMACS 2021+ for equilibration and production), Parrinello-Rahman (production, can oscillate if far from equilibrium), Berendsen (equilibration only), MTTK (md-vv), no.'],
['pcoupltype','isotropic, semiisotropic (membranes: xy, z), anisotropic, surface-tension.'],
['tau-p','Barostat time constant (ps). 2.0 typical; 5.0 for Parrinello-Rahman if unstable.'],
['compressibility','Isothermal compressibility in bar^-1. Water: 4.5e-5. Semiisotropic: two values.'],
['ref-p','Reference pressure (bar). 1.0 typical.'],
['refcoord-scaling','How reference positions for position restraints scale with the box: no, all, com. Use com with pressure coupling and position restraints.'],
['gen-vel','yes to generate initial velocities from a Maxwell distribution at gen-temp; use yes in NVT, no afterwards (continuation).'],
['gen-temp','Temperature for velocity generation (K).'],
['gen-seed','Random seed; -1 picks a new one.'],
['continuation','yes to continue from a previous run (do not apply constraints to the starting structure). Use yes after NVT, in NPT and production.'],
['constraints','none, h-bonds (typical with 2 fs), all-bonds, h-angles, all-angles.'],
['constraint-algorithm','lincs (default) or shake. LINCS is parallel and faster.'],
['lincs-order','Expansion order for LINCS matrix inversion (default 4; 8 for large time steps or energy minimization with constraints).'],
['lincs-iter','Number of LINCS correction iterations (default 1; 2 for more accuracy).'],
['nstxout','Interval for writing coordinates to .trr (steps). 0 = never. Large file if small.'],
['nstvout','Interval for writing velocities to .trr.'],
['nstfout','Interval for writing forces to .trr.'],
['nstlog','Interval for writing energies to the .log file.'],
['nstenergy','Interval for writing energies to .edr. Should be a multiple of nstcalcenergy.'],
['nstcalcenergy','Interval for computing energies and pressure (default 100).'],
['nstxout-compressed','Interval for writing compressed coordinates to .xtc (e.g. 5000 steps = 10 ps at 2 fs).'],
['compressed-x-grps','Group(s) saved to .xtc (default whole system). Use Protein to save space; keep it consistent with your tpr for later analysis.'],
['compressed-x-precision','Precision of .xtc (default 1000 = 0.001 nm).'],
['energygrps','Groups whose pairwise energies are written to edr. Rarely needed; incompatible with GPU runs in many cases.'],
['freezegrps','Groups with frozen atoms; use with freezedim.'],
['acc-grps','Groups with constant acceleration (non-equilibrium MD).'],
['annealing','Simulated annealing per tc group: no, single, periodic. With annealing-npoints, annealing-time, annealing-temp.'],
['disre','Distance restraints: no, simple, ensemble.'],
['pull','Enable the pull code (umbrella sampling, constraint pulling). Needs pull-ngroups, pull-ncoords, pull-coord1-type, pull-coord1-geometry, pull-coord1-k, pull-coord1-rate.'],
['free-energy','yes to enable alchemical free-energy calculations (see init-lambda-state, sc-alpha).'],
['implicit-solvent','Removed from recent GROMACS versions.'],
['mass-repartition-factor','Scale masses of the lightest atoms (2023+), allowing dt up to 4 fs with constraints h-bonds, typically factor 3.'],
['simulated-tempering','Simulated tempering (expanded ensemble) switch; used with free-energy options.'],
['E-x','Applied electric field (x component).'],
['QMMM-grps','Groups handled with quantum mechanics via CP2K interface (2022+) or other QM/MM setups.']
],

topics: [
{title:'Standard workflow overview', keys:['workflow','overview','steps','procedure','pipeline','tutorial','how to run','start','begin'], text:R`Typical protein-in-water workflow:
1. Preparation: clean pdb, pdb2gmx (force field + water), editconf (box), solvate, grompp + genion (neutralize, add salt).
2. Energy minimization: steepest descent (robust, far from minimum) or conjugate gradient (efficient near minimum). Check potential energy and Fmax < emtol.
3. Equilibration: NVT (temperature, position restraints on heavy atoms, 100 ps), then NPT (pressure and density, 100 ps+).
4. Production: restraints off, Parrinello-Rahman barostat, write xtc.
5. PBC correction and analysis: trjconv -pbc mol -center, fit, then RMSD, RMSF, Rg, H-bonds, SASA, DSSP, energies.
Ask me for the full script, one step, or one analysis.`},
{title:'Choosing a force field', keys:['force field choice','which force field','amber','charmm','gromos','opls','charmm36','amber14'], text:R`Bundled with GROMACS: AMBER (amber03, amber94, amber96, amber99, amber99sb, amber99sb-ildn), CHARMM27, GROMOS 43a1/43a2/45a3/53a5/53a6/54a7, OPLS-AA/L, and others. CHARMM36 and amber14sb/ff19SB are downloaded separately (copy the *.ff folder into the working directory or GMXLIB).
Matching water: AMBER -> TIP3P (or OPC/TIP4P-Ew if provided), CHARMM -> TIP3P modified (CHARMM TIP3P), GROMOS -> SPC, OPLS -> TIP4P or TIP3P. Cutoffs differ per force field (AMBER 1.0 nm, CHARMM 1.2 nm with force-switch, GROMOS 1.4 nm). Do not mix parameters between force fields. Ligands need matching parameters (CGenFF for CHARMM, GAFF/acpype for AMBER, ATB for GROMOS, LigParGen for OPLS).`},
{title:'Water models', keys:['water models','tip3p','spc/e','spce','tip4p','tip5p','opc'], text:R`tip3p (3 sites, AMBER and CHARMM native), spc and spce (3 sites, GROMOS native / general), tip4p (4 sites, needs tip4p.gro for solvate), tip5p. Use -water on pdb2gmx; solvent coordinate files: spc216.gro (3-site), tip4p.gro, tip5p.gro. Water model must match the force field.`},
{title:'Thermostats and barostats', keys:['thermostat','barostat','berendsen','nose-hoover','parrinello','v-rescale','c-rescale','ensemble','nvt','npt','coupling'], text:R`NVT: V-rescale (tau_t 0.1) is robust. NPT equilibration: C-rescale (tau_p 2.0). Production NPT: Parrinello-Rahman or C-rescale. Berendsen gives wrong fluctuations (flying ice cube, suppressed fluctuations): use only for early equilibration. Nose-Hoover with tau_t >= 1 ps. Couple Protein and Non-Protein (or SOL_ION) separately, never solute-only groups that are very small. Pressure: isotropic for soluble proteins, semiisotropic for membranes.`},
{title:'PBC correction', keys:['pbc correction','periodic boundary','broken molecule','jump','jumps','molecule leaves box','unwrap','make whole','pbc'], text:R`Trajectories are written with atoms wrapped into the box, so molecules appear broken or jump. Correct before analysis (not before RMSD of single solvent-free runs unless fitting is poor):
~~~
printf "Protein\nSystem\n" | gmx trjconv -s md.tpr -f md.xtc -o md_center.xtc -pbc mol -center -ur compact
printf "Backbone\nSystem\n" | gmx trjconv -s md.tpr -f md_center.xtc -o md_fit.xtc -fit rot+trans
~~~
For difficult cases (multiple chains, complex, membrane) do it in steps: -pbc whole (make molecules whole), -pbc cluster (cluster chains, needs a reference), -pbc nojump (remove jumps), then center with -pbc mol -ur compact, finally -fit. Use the tpr from the same run (md.tpr) so molecules are known. Never run analysis that depends on distances across the boundary without nojump/whole logic, and keep box large enough (min image convention: protein-to-image distance > cutoff, ideally 2 nm).`},
{title:'Minimization tips', keys:['minimization','minimisation','steepest descent','steep','conjugate gradient','cg','em','fmax','not converged','did not converge'], text:R`steep: robust, use first, emtol 1000, emstep 0.01, up to 50000 steps. cg: more efficient near minimum, cannot be used with constraints (use constraints = none or h-bonds with flexible water: define = -DFLEXIBLE) and needs nstcgsteep. l-bfgs: fast but not parallel. Success message: 'Steepest Descents converged to Fmax < 1000'. If Fmax stays large (>1e4) or stops at machine precision, check for atom overlaps, wrong topology, missing atoms, or very close water/ligand. Check Epot negative (order -1e5 to -1e6 kJ/mol for ~50k atoms).`},
{title:'Equilibration checks', keys:['equilibration check','temperature stable','density stable','pressure fluctuates','is equilibrated','how long equilibrate'], text:R`NVT: temperature should reach and fluctuate around target within ~20-50 ps. NPT: density should converge (water about 997-1010 kg/m3 depending on force field and temperature; protein systems about 1000-1020). Pressure fluctuates strongly (hundreds of bar); judge by its average, not instantaneous values. Plot with gmx energy. If still drifting, extend NPT or lower tau/pressure coupling issues. Keep position restraints on heavy atoms (1000 kJ/mol/nm2) during equilibration.`},
{title:'Production run settings', keys:['production','production settings','how long','simulation length','time length','nstxout','save frequency'], text:R`Production: no position restraints, continuation = yes, gen-vel = no, V-rescale + Parrinello-Rahman (or C-rescale), compressed xtc every 10 ps (nstxout-compressed 5000 at 2 fs), energies every 10 ps, checkpoint every 15 min (default). Length depends on question: local flexibility 50-100 ns, ligand stability 100+ ns, repeat in triplicate with different gen-seed for statistical confidence. Estimate: nsteps = ns * 1000 / dt (10 ns at 2 fs = 5,000,000 steps).`},
{title:'Restart and extend', keys:['restart','continue run','crashed','resume','append','cpt','extend run'], text:R`Resume from checkpoint:
~~~
gmx mdrun -deffnm md -cpi md.cpt -append
~~~
Extend a finished run:
~~~
gmx convert-tpr -s md.tpr -extend 10000 -o md.tpr
gmx mdrun -s md.tpr -cpi md.cpt -deffnm md
~~~
-noappend writes numbered part files (md.part0002.xtc) which you can join with gmx trjcat and gmx eneconv.`},
{title:'File formats', keys:['file format','file formats','gro','pdb','top','itp','mdp','tpr','trr','xtc','cpt','edr','log','ndx','xvg','xpm','tng','extension','files'], text:R`**.gro** fixed-column structure with velocities and box (nm). **.pdb** Protein Data Bank (Angstrom). **.top/.itp** topology and include files. **.mdp** run parameters (text). **.tpr** portable binary run input (structure+topology+parameters). **.trr** full-precision trajectory (x, v, f). **.xtc** compressed positions only (precision 0.001 nm by default). **.cpt** checkpoint (full state for exact restart). **.edr** portable binary energies (read with gmx energy). **.log** text log with performance. **.ndx** index groups. **.xvg** plot data (xmgrace/matplotlib). **.xpm** matrix images. **.tng** compressed trajectory format (optional).
For analysis you need a tpr (or gro/pdb) plus a trajectory (xtc or trr) from the same system and group selection.`},
{title:'Index groups', keys:['default groups','group names','system','non-protein','sol_ion','backbone','c-alpha','mainchain'], text:R`Default groups from gmx make_ndx / most tools: System, Protein, Protein-H, C-alpha, Backbone, MainChain, MainChain+Cb, MainChain+H, SideChain, SideChain-H, Prot-Masses, non-Protein, Other, ligand names, Water, SOL, non-Water, Ion, Water_and_ions. Use gmx make_ndx to define more. Names can be typed instead of numbers in piped input (case sensitive enough to match).`},
{title:'Ligand and complex notes', keys:['ligand','protein-ligand','complex','drug','small molecule','acpype','cgenff','gaff','lig'], text:R`Protein-ligand: parametrize the ligand with a compatible tool (acpype/antechamber for GAFF with AMBER, CGenFF + cgenff_charmm2gmx for CHARMM, ATB for GROMOS, LigParGen for OPLS). Merge: include ligand.itp after the force field include in topol.top, add LIG to [ molecules ] after Protein, merge the coordinates into the .gro (update atom count). Use tc-grps Protein_LIG Water_and_ions (build with make_ndx '1 | 13'). Use restraints for ligand during equilibration with genrestr. Same pipeline otherwise.`},
{title:'Membrane notes', keys:['membrane','lipid','bilayer','popc','dppc','charmm-gui','semiisotropic'], text:R`Build the membrane with CHARMM-GUI, insane (Martini) or gmx insert-molecules; use pcoupltype = semiisotropic with tau-p 5 and compressibility 4.5e-5 for xy and z, tc-grps Protein_Lipids Water_and_ions, and a long equilibration (restraints released in stages, 100 ns for lipids to relax is not unusual). Use C-rescale or Parrinello-Rahman for production, constraints h-bonds, force field must be a lipid-compatible one (CHARMM36, Slipids, Lipid21).`},
{title:'Performance tips', keys:['speed','slow','faster','gpu','cpu','threads','ns per day','performance','optimize','mpi','cuda','opencl','sycl'], text:R`Check build: gmx --version (look for GPU support, SIMD, MPI/thread-MPI). Commands: gmx mdrun -ntmpi 1 -ntomp <cores> -nb gpu -pme gpu -bonded gpu -update gpu -pin on. Increase nstcalcenergy/nstenergy/nstlog, write xtc less often, use dodecahedron box, keep system small (Protein only in xtc via compressed-x-grps). For multiple replicas use -multidir. Use gmx_mpi for cluster builds with mpirun/srun.`},
{title:'Install GROMACS', keys:['install','installation','conda','apt','brew','cmake','download','compile','module load'], text:R`Quick options:
~~~
conda install -c conda-forge gromacs          # simplest, CPU
sudo apt install gromacs                      # Debian/Ubuntu (may be older)
brew install gromacs                          # macOS
~~~
From source: download tarball from gromacs.org, mkdir build && cd build, cmake .. -DGMX_BUILD_OWN_FFTW=ON -DGMX_GPU=CUDA, make -j, make check, sudo make install, source /usr/local/gromacs/bin/GMXRC. Cluster: module load gromacs. Check with gmx --version.`},
{title:'Units and conventions', keys:['units','nm','kj/mol','ps','conventions','unit system'], text:R`GROMACS units: length nm, mass amu, time ps, charge e, temperature K, pressure bar, energy kJ/mol, force kJ/mol/nm, velocity nm/ps, angle degrees (input), 1 bar = 0.06022 kJ/mol/nm3. PDB files are in Angstrom; GRO in nm; conversions are done by the tools.`},
{title:'Analysis plotting', keys:['plot','xvg','xmgrace','matplotlib','graph','figure','visualize','vmd','pymol','chimera'], text:R`.xvg files are text: columns after comment lines starting with # and @. Plot with xmgrace (-xvg xmgrace), or python (numpy.loadtxt(comments=('#','@'))), or any spreadsheet. Use -xvg none to remove header lines. Visualize trajectories with VMD (load md.gro then md_fit.xtc), PyMOL, ChimeraX, or MDAnalysis/MDTraj in Python. I can generate a small python plotting script: ask 'plot xvg'.`},
{title:'Reproducibility', keys:['reproducible','seed','random','bitwise','reproducibility','statistics','replicate','replicates','error bars'], text:R`Use gen-seed to repeat velocity generation; mdrun is not bitwise reproducible across hardware but statistically equivalent; -reprod gives reproducible behavior on same hardware. Run at least 3 independent replicas with different velocity seeds, report mean and standard deviation of observables, and block-average with gmx analyze -ee for error estimates.`}
],

trouble: [
{keys:['residue not found','not found in residue topology database','rtp','residue topology'], title:"Residue 'XXX' not found in residue topology database", text:R`The force field has no entry for that residue (ligand, cofactor, modified residue, ion, water naming). Fix: remove hetero atoms (grep -v HETATM) and parametrize them separately, rename residues to the force-field names (e.g. HOH->SOL handled by pdb2gmx, HSD/HSE/HSP for CHARMM histidines), or add residuetypes.dat entries for ions/ligands.`},
{keys:['atom not found in rtp','missing atoms','atom in residue not found','heavy atoms missing','missing heavy','truncated'], title:'Atom X in residue Y not found in rtp entry / missing heavy atoms', text:R`The pdb is missing atoms (unresolved loops, truncated side chains) or atom names differ. Rebuild with a modeller (MODELLER, PDBFixer, SWISS-MODEL, Chimera Dock Prep), delete incomplete residues only if appropriate, or use -ignh when only hydrogen names are the problem. Do not use pdb2gmx -missing for production.`},
{keys:['long bond','bond between atoms is longer','longer than 0.5','chain break','chain'], title:'Long bonds or chain breaks in pdb2gmx', text:R`The pdb has a gap (missing residues) or two chains are merged. Use -chainsep, split the chain, or model the missing residues. Termini for each chain are asked interactively (-ter) or defaulted.`},
{keys:['number of coordinates','does not match topology','coordinate file does not match','atom count','mismatch','atoms in topology'], title:'Number of coordinates in coordinate file does not match topology', text:R`The [ molecules ] counts in topol.top do not match the .gro. Common causes: solvate/genion modified topology but you used an old gro, or copied files from different runs. Check the last lines of topol.top and the atom count (line 2 of .gro). Make sure the same topol.top is edited by solvate and genion.`},
{keys:['lincs','blowing up','blow up','crash','segmentation','nan','unstable','exploded','step 0','too many lincs','rotation of bond'], title:'LINCS warnings / system blows up', text:R`Typical causes and fixes: insufficient or failed minimization (rerun EM with lower emtol and check Fmax), no or wrong equilibration (do NVT then NPT with restraints), time step too large (use 0.002 with h-bonds constraints; 0.001 for debugging), bad contacts or missing parameters, wrong barostat/thermostat settings, ligand parameters. Debug tips: write coordinates every step (nstxout 1) for a few steps and visualize, run EM longer, try define = -DFLEXIBLE only for EM, reduce dt temporarily. Check log for the atom pairs named in LINCS warnings.`},
{keys:['net charge','charge of the system','system has non-zero total charge','non-zero charge','total charge'], title:'System has non-zero total charge', text:R`PME requires a neutral system. Add counter-ions with gmx genion -neutral. For a charged ligand, check its charge sums correctly in the itp (use more decimals).`},
{keys:['invalid order for directive','directive','include order','itp order'], title:'Invalid order for directive xxx', text:R`Topology sections are out of order. [ defaults ] and [ atomtypes ] come from the force field include first; then your ligand itp (which may define only [ moleculetype ]...), then position restraints, water, ions, and finally [ system ] and [ molecules ]. Ligand [ atomtypes ] must be placed before the first [ moleculetype ].`},
{keys:['maxwarn','grompp warning','grompp warnings','too many warnings'], title:'grompp warnings and -maxwarn', text:R`Read every warning. Safe-to-ignore cases are rare (e.g. 'You are using Berendsen'). Do not blanket-add -maxwarn; typical legitimate ones: net charge fixed later with genion, tc-grps interpreting COM motion. Better fix the root cause.`},
{keys:['group not found','tc-grps','tc_grps','group name','is not in the index','invalid group'], title:'tc-grps group not found', text:R`The group names in tc-grps must exist in the index file. With a ligand or custom groups run gmx make_ndx and pass -n index.ndx to grompp. For simple systems use tc-grps = System with one tau-t and ref-t value, or Protein Non-Protein.`},
{keys:['did not converge','fmax','converge','minimization failed','machine precision','stopped because'], title:'Energy minimization did not converge', text:R`Increase nsteps, check overlapping atoms, use steep first then cg, make sure the topology is complete and constraints are off for cg. 'Converged to machine precision but not Fmax < emtol' is often acceptable for emtol 1000 if Fmax is below about 2000 for single precision; otherwise inspect the structure.`},
{keys:['domain decomposition','dd cell','too small','cells','rdd','pme ranks','cut-off larger'], title:'Domain decomposition error', text:R`Too many ranks for the system size, or box too small for the cutoffs. Use fewer ranks (-ntmpi), more OpenMP threads (-ntomp), -pme gpu, -dd 1 1 1 for debugging, or -rdd 1.0. Check the minimum image convention.`},
{keys:['out of memory','memory','cuda error','illegal memory','gpu error','failed to','cannot allocate'], title:'Memory or GPU errors', text:R`Out of memory: reduce system size or output frequency, or run on fewer threads. GPU errors: update driver and GROMACS, run without -update gpu or -bonded gpu, test with -nb cpu to isolate, avoid features unsupported on GPU (e.g. energygrps with free energy, certain pull setups).`},
{keys:['posre','position restraint','posre.itp','include','not found','fatal error: include','#include'], title:'Include file not found (posre.itp, force field)', text:R`Run from the directory that contains posre.itp and the .ff folders, or set GMXLIB. If you renamed the posre file with pdb2gmx -i, update the topology include. Custom force fields must sit in the working directory or $GMXLIB/top.`},
{keys:['vdw','charge groups','cutoff-scheme group','group scheme','rlist','removed'], title:'Group cut-off scheme errors', text:R`Group scheme has been removed. Use cutoff-scheme = Verlet (only option). Remove charge group related options from old mdp files, and use vdw-modifier/DispCorr instead of vdwtype = shift/switch.`},
{keys:['single precision','double precision','mixed precision','gmx_d','precision'], title:'Precision warnings', text:R`Default builds are mixed (single) precision, adequate for MD. For minimization to very low emtol or normal modes use double precision (gmx_d, build with -DGMX_DOUBLE=ON).`},
{keys:['xtc','frame','missing frames','trajectory fewer','empty trajectory','file size','truncated xtc'], title:'Trajectory file issues', text:R`Check with gmx check -f md.xtc. Missing or corrupted tail frames after a crash: restart with -cpi md.cpt -append (mdrun truncates to checkpoint). Group mismatch between tpr and xtc: xtc written with compressed-x-grps = Protein needs a matching tpr (gmx convert-tpr -n index.ndx with that group) or gmx trjconv -s md.tpr will complain about atom number.`}
]
};
