/**
 * D&D 5e: Damage After Attack
 *
 * After an attack roll (hit or miss) this either opens the damage roll dialog,
 * or rolls damage automatically without the dialog. Damage is never applied —
 * the roll lands in chat with the normal dnd5e apply buttons, same as clicking
 * the Damage button yourself.
 *
 * The setting is client-scoped, so every player chooses for themselves.
 */

const MODULE_ID = "dnd5e-attack-damage-qol";

const MODES = Object.freeze({
  OFF: "off",
  PROMPT: "prompt",
  AUTO: "auto"
});

/**
 * Data captured in `dnd5e.rollAttack` (before ammunition is consumed) and used
 * in `dnd5e.postRollAttack`. Both hooks receive the same `rolls` array, so it
 * makes a convenient key.
 * @type {WeakMap<object[], {ammunition: Item|undefined, attackMode: string|undefined, isCritical: boolean}>}
 */
const pending = new WeakMap();

/* -------------------------------------------- */
/*  Settings                                    */
/* -------------------------------------------- */

Hooks.once("init", () => {
  game.settings.register(MODULE_ID, "mode", {
    name: `${MODULE_ID}.Settings.Mode.Name`,
    hint: `${MODULE_ID}.Settings.Mode.Hint`,
    scope: "client",
    config: true,
    type: String,
    choices: {
      [MODES.OFF]: `${MODULE_ID}.Settings.Mode.Choices.Off`,
      [MODES.PROMPT]: `${MODULE_ID}.Settings.Mode.Choices.Prompt`,
      [MODES.AUTO]: `${MODULE_ID}.Settings.Mode.Choices.Auto`
    },
    default: MODES.OFF
  });
});

/**
 * @returns {string} The current client's chosen mode.
 */
function getMode() {
  try {
    return game.settings.get(MODULE_ID, "mode") ?? MODES.OFF;
  } catch {
    return MODES.OFF;
  }
}

/* -------------------------------------------- */
/*  Hooks                                       */
/* -------------------------------------------- */

/**
 * Fires on the rolling client after the attack is rolled but before ammunition
 * is consumed. Ammunition might be deleted right after this (last arrow), so a
 * copy is taken here so the damage roll can still use it.
 */
Hooks.on("dnd5e.rollAttack", (rolls, { subject } = {}) => {
  if ( getMode() === MODES.OFF ) return;
  if ( !subject || !rolls?.length ) return;

  const roll = rolls[0];
  const actor = subject.actor;
  let ammunition;
  const ammoId = roll.options?.ammunition;
  if ( ammoId && actor ) {
    const ammo = actor.items.get(ammoId);
    if ( ammo ) ammunition = new Item.implementation(ammo.toObject(), { parent: actor });
  }

  pending.set(rolls, {
    ammunition,
    attackMode: roll.options?.attackMode,
    isCritical: !!roll.isCritical
  });
});

/**
 * Fires on the rolling client once the attack message exists and ammunition has
 * been consumed. This is where damage gets rolled.
 */
Hooks.on("dnd5e.postRollAttack", (rolls, { subject } = {}) => {
  const data = pending.get(rolls);
  if ( !data ) return;
  pending.delete(rolls);

  const mode = getMode();
  if ( mode === MODES.OFF || !subject ) return;

  // Same condition dnd5e uses to decide whether to show the Damage button.
  const hasDamage = subject.damage?.parts?.length || subject.item?.system?.properties?.has("amm");
  if ( !hasDamage || (typeof subject.rollDamage !== "function") ) return;

  rollDamageAfterAttack(subject, data, mode).catch(err => {
    console.error(`${MODULE_ID} | Failed to roll damage after attack`, err);
  });
});

/* -------------------------------------------- */
/*  Damage                                      */
/* -------------------------------------------- */

/**
 * Roll damage for an attack activity.
 * @param {Activity} activity  The attack activity that just rolled.
 * @param {object} data        Data captured from the attack roll.
 * @param {string} mode        "prompt" or "auto".
 */
async function rollDamageAfterAttack(activity, { ammunition, attackMode, isCritical }, mode) {
  const configure = mode === MODES.PROMPT;

  const dialog = { configure };
  if ( configure && isCritical ) dialog.options = { defaultButton: "critical" };

  // Link the damage roll to the same usage card the attack belongs to, so it
  // groups with it in chat exactly like a manual damage roll would.
  const originatingMessage = findOriginatingMessageId(activity);
  const message = originatingMessage
    ? { data: { flags: { dnd5e: { originatingMessage } } } }
    : {};

  await activity.rollDamage({ ammunition, attackMode, isCritical }, dialog, message);
}

/**
 * Find the usage card that the latest attack for this activity came from.
 * @param {Activity} activity
 * @returns {string|null}
 */
function findOriginatingMessageId(activity) {
  const messages = game.messages?.contents ?? [];
  const userId = game.user?.id;
  const stop = Math.max(0, messages.length - 30);
  let usageFallback = null;

  for ( let i = messages.length - 1; i >= stop; i-- ) {
    const msg = messages[i];
    const flags = msg.flags?.dnd5e;
    if ( flags?.activity?.uuid !== activity.uuid ) continue;
    const authorId = msg.author?.id ?? msg.user?.id;
    if ( authorId !== userId ) continue;

    // Most recent attack roll for this activity: use the card it points at.
    if ( flags.roll?.type === "attack" ) {
      if ( flags.originatingMessage ) return flags.originatingMessage;
      continue;
    }

    // Otherwise remember the latest usage card for this activity.
    if ( !usageFallback && (msg.type === "usage") ) usageFallback = msg.id;
  }

  return usageFallback;
}
