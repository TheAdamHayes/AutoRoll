# D&D 5e: Damage After Attack

A small quality-of-life module for the **D&D 5e** system on **Foundry VTT**.

After you make an attack roll, hit **or** miss, it can:

- **Open the damage roll dialog** straight away, or
- **Roll damage automatically** with no dialog.

Damage is **never applied** by this module. The damage card appears in chat with the normal dnd5e apply buttons, exactly as if you had clicked "Damage" yourself. Critical hits are carried over (the dialog defaults to the Critical button; auto-rolls roll crit damage).

## Settings

*Game Settings → Configure Settings → Module Settings → Damage After Attack*

| Option | What it does |
|---|---|
| Off | Default dnd5e behaviour |
| Open the damage roll dialog | Damage dialog pops up after every attack |
| Roll damage automatically | Damage is rolled to chat after every attack, not applied |

This is a **client** setting, so each player (and the GM) chooses their own.

## Compatibility

- Foundry VTT v13 – v14
- dnd5e system 5.3.x

## Installation

Paste this manifest URL into Foundry's *Install Module* dialog:

```
https://github.com/OWNER/REPO/releases/latest/download/module.json
```

## Releasing (for the maintainer)

1. Bump `"version"` in `module.json` (e.g. `1.0.0` → `1.0.1`).
2. Commit and push to `main`.

The GitHub Action builds `module.zip`, creates release `v1.0.1`, and Foundry will offer the update. Pushing without changing the version does nothing.

### Publishing to the Foundry package listing (optional)

1. Create the package listing once on foundryvtt.com (the package id must be `dnd5e-attack-damage-qol`).
2. Copy the **Package Release Token** from the listing's edit page.
3. In GitHub: *Settings → Secrets and variables → Actions → New repository secret*, name it `FOUNDRY_RELEASE_TOKEN`.

From then on every release is also pushed to the Foundry listing automatically.

## License

MIT
