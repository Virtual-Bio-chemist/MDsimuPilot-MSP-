# Virtual Bio-Chemist

A browser chatbot that writes GROMACS bash scripts and answers GROMACS questions. No installation, no server, no build step: it is plain HTML, CSS and JavaScript.

## What it does
1. System preparation (pdb2gmx, editconf, solvate, genion)
2. Energy minimization (asks: steepest descent or conjugate gradient)
3. Equilibration (NVT, NPT)
4. Production run
5. PBC correction and basic analysis (RMSD, RMSF, Rg, H-bonds, SASA, DSSP, energies, clustering, PCA, RDF, MSD)

Ask for the **full workflow** (one `run_all.sh`), any **single step**, or any **single analysis**. File names (.gro, .tpr, .edr, .xtc, .trr, .pdb, .top) are set in Settings or typed in the message, for example `rmsd for run1.xtc`.

Ask about commands (`gmx trjconv`), mdp options (`tau-p`), file formats, errors (`LINCS warnings`), or restarting and extending runs. Answers come from the offline knowledge base in `kb.js`. Optionally, enter an Anthropic API key in Settings and open questions go to Claude. The key is kept in session storage and sent only to api.anthropic.com.

## Publish on GitHub (browser only)
1. Create a new repository on github.com.
2. Click **Add file > Upload files**, drag in all files from this folder (keep `logo.png` and `avatar.png`), and commit.
3. Go to **Settings > Pages**, set Source to **Deploy from a branch**, branch `main`, folder `/ (root)`, and save.
4. After a minute the bot is live at `https://<your-user>.github.io/<repo>/`.

You can also open `index.html` directly in a browser.

## Files
- `index.html`, `style.css`: interface
- `app.js`: chat logic, intent detection, optional Claude call
- `gen.js`: script and mdp generators
- `kb.js`: GROMACS knowledge base (commands, mdp options, topics, troubleshooting)
- `logo.png`, `avatar.png`: branding

## Notes
- Generated scripts target GROMACS 2021+ (C-rescale barostat, `gmx dssp` needs 2023+). Check with `gmx --version`.
- Parameters are sensible protein-in-water defaults, not a substitute for reading the manual for your system (ligands, membranes, and so on).
- The knowledge base is a summary, not a copy of the manual: https://manual.gromacs.org
