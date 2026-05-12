/**
 * The D&D fifth edition game system for Foundry Virtual Tabletop
 * A system for playing the fifth edition of the world's most popular role-playing game.
 * Author: Atropos
 * Software License: MIT
 * Content License: https://www.dndbeyond.com/attachments/39j2li89/SRD5.1-CCBY4.0License.pdf
 *                  https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.pdf
 * Repository: https://github.com/foundryvtt/dnd5e
 * Issue Tracker: https://github.com/foundryvtt/dnd5e/issues
 */

// Import Configuration
import DND5E from "./module/config.mjs";
import {
  applyLegacyRules, registerDeferredSettings, registerSystemKeybindings, registerSystemSettings
} from "./module/settings.mjs";

// Import Submodules
import * as applications from "./module/applications/_module.mjs";
import * as canvas from "./module/canvas/_module.mjs";
import * as dataModels from "./module/data/_module.mjs";
import * as dice from "./module/dice/_module.mjs";
import * as documents from "./module/documents/_module.mjs";
import * as enrichers from "./module/enrichers.mjs";
import * as Filter from "./module/filter.mjs";
import * as migrations from "./module/migration.mjs";
import ModuleArt from "./module/module-art.mjs";
import { registerModuleData, registerModuleRedirects, setupModulePacks } from "./module/module-registration.mjs";
import { default as registry } from "./module/registry.mjs";
import Tooltips5e from "./module/tooltips.mjs";
import * as utils from "./module/utils.mjs";
import DragDrop5e from "./module/drag-drop.mjs";

/* -------------------------------------------- */
/*  Define Module Structure                     */
/* -------------------------------------------- */

globalThis.dnd5e = {
  applications,
  canvas,
  config: DND5E,
  dataModels,
  dice,
  documents,
  enrichers,
  Filter,
  migrations,
  registry,
  ui: {},
  utils
};

/* -------------------------------------------- */
/*  Foundry VTT Initialization                  */
/* -------------------------------------------- */

Hooks.once("init", function() {
  globalThis.dnd5e = game.dnd5e = Object.assign(game.system, globalThis.dnd5e);
  utils.log(`Initializing the D&D Fifth Game System - Version ${dnd5e.version}\n${DND5E.ASCII}`);

  /**
   * Suppress some known deprecations.
   * @deprecated
   * @since 5.3.0
   */
  CONFIG.compatibility.excludePatterns.push(/numeric #mode/, /CONST\.ACTIVE_EFFECT_MODES/, /ContextMenuEntry#/,
    /foundry\.data\.operators\.ForcedDeletion/, /foundry\.utils\.buildRelativeUuid/, /CONFIG.ChatMessage.modes/,
    /core\.rollMode/, /ChatMessage\.applyRollMode/, /Scene#templates/, /MeasuredTemplate/, /MeasuredTemplateDocument/,
    /core\.gridTemplates/, /core\.coneTemplateType/, /ControlIcon#refresh/);

  // Record Configuration Values
  CONFIG.DND5E = DND5E;
  CONFIG.ActiveEffect.documentClass = documents.ActiveEffect5e;
  CONFIG.ActiveEffect.legacyTransferral = false;
  CONFIG.Actor.collection = dataModels.collection.Actors5e;
  CONFIG.Actor.documentClass = documents.Actor5e;
  CONFIG.Adventure.documentClass = documents.Adventure5e;
  CONFIG.ChatMessage.documentClass = documents.ChatMessage5e;
  CONFIG.Combat.documentClass = documents.Combat5e;
  CONFIG.Combatant.documentClass = documents.Combatant5e;
  CONFIG.CombatantGroup.documentClass = documents.CombatantGroup5e;
  CONFIG.Item.collection = dataModels.collection.Items5e;
  CONFIG.Item.compendiumIndexFields.push("system.container", "system.identifier");
  CONFIG.Item.documentClass = documents.Item5e;
  CONFIG.JournalEntryPage.documentClass = documents.JournalEntryPage5e;
  CONFIG.Token.documentClass = documents.TokenDocument5e;
  CONFIG.Token.objectClass = canvas.Token5e;
  CONFIG.Token.rulerClass = canvas.TokenRuler5e;
  CONFIG.Token.movement.TerrainData = dataModels.TerrainData5e;
  CONFIG.User.documentClass = documents.User5e;
  CONFIG.time.roundTime = 6;
  Roll.TOOLTIP_TEMPLATE = "systems/dnd5e/templates/chat/roll-breakdown.hbs";
  CONFIG.Dice.BasicDie = CONFIG.Dice.terms.d = dice.BasicDie;
  CONFIG.Dice.BasicRoll = dice.BasicRoll;
  CONFIG.Dice.DamageRoll = dice.DamageRoll;
  CONFIG.Dice.D20Die = dice.D20Die;
  CONFIG.Dice.D20Roll = dice.D20Roll;
  CONFIG.MeasuredTemplate.defaults.angle = 53.13; // 5e cone RAW should be 53.13 degrees
  CONFIG.Note.objectClass = canvas.Note5e;
  CONFIG.ui.chat = applications.ChatLog5e;
  CONFIG.ui.combat = applications.combat.CombatTracker5e;
  CONFIG.ui.items = applications.item.ItemDirectory5e;
  CONFIG.ux.DragDrop = DragDrop5e;

  if ( game.release.generation < 14 ) CONFIG.Token.layerClass = canvas.layers.TokenLayer5e;
  CONFIG.Canvas.layers.tokens.layerClass = canvas.layers.TokenLayer5e;

  // Register System Settings
  registerSystemSettings();
  registerSystemKeybindings();

  // Configure module art
  game.dnd5e.moduleArt = new ModuleArt();

  // Configure bastions
  game.dnd5e.bastion = new documents.Bastion();

  // Configure tooltips
  game.dnd5e.tooltips = new Tooltips5e();

  // Remove honor & sanity from configuration if they aren't enabled
  if ( !game.settings.get("dnd5e", "honorScore") ) delete DND5E.abilities.hon;
  if ( !game.settings.get("dnd5e", "sanityScore") ) delete DND5E.abilities.san;

  // Legacy rules.
  if ( dnd5e.settings.rulesVersion === "legacy" ) applyLegacyRules();

  // Register system
  DND5E.SPELL_LISTS.forEach(uuid => dnd5e.registry.spellLists.register(uuid));

  // Register module data from manifests
  registerModuleData();
  registerModuleRedirects();

  // Register Roll Extensions
  CONFIG.Dice.rolls = [dice.BasicRoll, dice.D20Roll, dice.DamageRoll];

  // Hook up system data types
  Object.assign(CONFIG.ActiveEffect.dataModels, dataModels.activeEffect.config);
  CONFIG.Actor.dataModels = dataModels.actor.config;
  CONFIG.ChatMessage.dataModels = dataModels.chatMessage.config;
  CONFIG.Item.dataModels = dataModels.item.config;
  CONFIG.JournalEntryPage.dataModels = dataModels.journal.config;
  Object.assign(CONFIG.RegionBehavior.dataModels, dataModels.regionBehavior.config);
  Object.assign(CONFIG.RegionBehavior.typeIcons, dataModels.regionBehavior.icons);

  // Add fonts
  _configureFonts();

  // Register sheet application classes
  const DocumentSheetConfig = foundry.applications.apps.DocumentSheetConfig;
  DocumentSheetConfig.unregisterSheet(Actor, "core", foundry.appv1.sheets.ActorSheet);
  DocumentSheetConfig.registerSheet(Actor, "dnd5e", applications.actor.CharacterActorSheet, {
    types: ["character"],
    makeDefault: true,
    label: "DND5E.SheetClass.Character"
  });
  DocumentSheetConfig.registerSheet(Actor, "dnd5e", applications.actor.NPCActorSheet, {
    types: ["npc"],
    makeDefault: true,
    label: "DND5E.SheetClass.NPC"
  });
  DocumentSheetConfig.registerSheet(Actor, "dnd5e", applications.actor.VehicleActorSheet, {
    types: ["vehicle"],
    makeDefault: true,
    label: "DND5E.SheetClass.Vehicle"
  });
  DocumentSheetConfig.registerSheet(Actor, "dnd5e", applications.actor.GroupActorSheet, {
    types: ["group"],
    makeDefault: true,
    label: "DND5E.SheetClass.Group"
  });
  DocumentSheetConfig.registerSheet(Actor, "dnd5e", applications.actor.EncounterActorSheet, {
    types: ["encounter"],
    makeDefault: true,
    label: "DND5E.SheetClass.Encounter"
  });

  DocumentSheetConfig.unregisterSheet(Item, "core", foundry.appv1.sheets.ItemSheet);
  DocumentSheetConfig.registerSheet(Item, "dnd5e", applications.item.ItemSheet5e, {
    makeDefault: true,
    label: "DND5E.SheetClass.Item"
  });
  DocumentSheetConfig.unregisterSheet(Item, "dnd5e", applications.item.ItemSheet5e, { types: ["container"] });
  DocumentSheetConfig.registerSheet(Item, "dnd5e", applications.item.ContainerSheet, {
    makeDefault: true,
    types: ["container"],
    label: "DND5E.SheetClass.Container"
  });

  DocumentSheetConfig.registerSheet(JournalEntry, "dnd5e", applications.journal.JournalEntrySheet5e, {
    makeDefault: true,
    label: "DND5E.SheetClass.JournalEntry"
  });
  DocumentSheetConfig.registerSheet(JournalEntry, "dnd5e", applications.journal.JournalSheet5e, {
    makeDefault: false,
    canConfigure: false,
    canBeDefault: false,
    label: "DND5E.SheetClass.JournalEntrySheetLegacy"
  });
  DocumentSheetConfig.registerSheet(JournalEntryPage, "dnd5e", applications.journal.JournalClassPageSheet, {
    label: "DND5E.SheetClass.ClassSummary",
    types: ["class", "subclass"]
  });
  DocumentSheetConfig.registerSheet(JournalEntryPage, "dnd5e", applications.journal.JournalMapLocationPageSheet, {
    label: "DND5E.SheetClass.MapLocation",
    types: ["map"]
  });
  DocumentSheetConfig.registerSheet(JournalEntryPage, "dnd5e", applications.journal.JournalRulePageSheet, {
    label: "DND5E.SheetClass.Rule",
    types: ["rule"]
  });
  DocumentSheetConfig.registerSheet(JournalEntryPage, "dnd5e", applications.journal.JournalSpellListPageSheet, {
    label: "DND5E.SheetClass.SpellList",
    types: ["spells"]
  });

  DocumentSheetConfig.unregisterSheet(RegionBehavior, "core", foundry.applications.sheets.RegionBehaviorConfig, {
    types: ["dnd5e.difficultTerrain", "dnd5e.rotateArea"]
  });
  DocumentSheetConfig.registerSheet(RegionBehavior, "dnd5e", applications.regionBehavior.DifficultTerrainConfig, {
    label: "DND5E.SheetClass.DifficultTerrain",
    types: ["dnd5e.difficultTerrain"]
  });
  DocumentSheetConfig.registerSheet(RegionBehavior, "dnd5e", applications.regionBehavior.RotateAreaConfig, {
    label: "DND5E.SheetClass.RotateArea",
    types: ["dnd5e.rotateArea"]
  });

  DocumentSheetConfig.registerSheet(RollTable, "dnd5e", applications.RollTableSheet5e, {
    makeDefault: true,
    label: "DND5E.SheetClass.RollTable"
  });

  CONFIG.Token.prototypeSheetClass = applications.PrototypeTokenConfig5e;
  DocumentSheetConfig.unregisterSheet(TokenDocument, "core", foundry.applications.sheets.TokenConfig);
  DocumentSheetConfig.registerSheet(TokenDocument, "dnd5e", applications.TokenConfig5e, {
    label: "DND5E.SheetClass.Token"
  });

  // Preload Handlebars helpers & partials
  utils.registerHandlebarsHelpers();
  utils.preloadHandlebarsTemplates();

  // Enrichers
  enrichers.registerCustomEnrichers();

  // Exhaustion handling
  documents.ActiveEffect5e.registerHUDListeners();

  // Set up token movement actions
  documents.TokenDocument5e.registerMovementActions();

  // Custom movement cost aggregator
  CONFIG.Token.movement.costAggregator = (results, distance, segment) => {
    return Math.max(...results.map(i => i.cost));
  };

  // Setup Calendar
  _configureCalendar();
});

/* -------------------------------------------- */

/**
 * Configure world calendar based on setting.
 */
function _configureCalendar() {
  CONFIG.time.earthCalendarClass = dataModels.calendar.CalendarData5e;
  CONFIG.time.worldCalendarClass = dataModels.calendar.CalendarData5e;

  /**
   * A hook event that fires during the `init` step to give modules a chance to customize the calendar
   * configuration before loading the world calendar.
   * @function dnd5e.preSetupCalendar
   * @memberof hookEvents
   * @returns               Explicitly return `false` to prevent system from setting up the calendar.
   */
  if ( Hooks.call("dnd5e.setupCalendar") === false ) return;

  const calendar = game.settings.get("dnd5e", "calendar");
  const calendarConfig = CONFIG.DND5E.calendar.calendars.find(c => c.value === calendar);
  if ( calendarConfig ) {
    CONFIG.time.worldCalendarConfig = calendarConfig.config;
    if ( calendarConfig.class ) CONFIG.time.worldCalendarClass = calendarConfig.class;
  }
}

/* -------------------------------------------- */

/**
 * Configure explicit lists of attributes that are trackable on the token HUD and in the combat tracker.
 * @internal
 */
function _configureTrackableAttributes() {
  const common = {
    bar: [],
    value: [
      ...Object.keys(DND5E.abilities).map(ability => `abilities.${ability}.value`),
      ...Object.keys(DND5E.movementTypes).map(movement => `attributes.movement.${movement}`),
      "attributes.ac.value", "attributes.init.total"
    ]
  };

  const creature = {
    bar: [
      ...common.bar,
      "attributes.hp",
      ..._trackedSpellAttributes()
    ],
    value: [
      ...common.value,
      ...Object.keys(DND5E.skills).map(skill => `skills.${skill}.passive`),
      ...Object.keys(DND5E.senses).map(sense => `attributes.senses.ranges.${sense}`),
      "attributes.hp.temp", "attributes.spell.attack", "attributes.spell.dc"
    ]
  };

  CONFIG.Actor.trackableAttributes = {
    character: {
      bar: [...creature.bar, "resources.primary", "resources.secondary", "resources.tertiary", "details.xp"],
      value: [...creature.value]
    },
    npc: {
      bar: [...creature.bar, "resources.legact", "resources.legres"],
      value: [...creature.value, "attributes.spell.level", "details.cr", "details.xp.value"]
    },
    vehicle: {
      bar: [...common.bar, "attributes.hp"],
      value: [...common.value]
    },
    group: {
      bar: [],
      value: []
    }
  };
}

/* -------------------------------------------- */

/**
 * Get all trackable spell slot attributes.
 * @param {string} [suffix=""]  Suffix appended to the path.
 * @returns {Set<string>}
 * @internal
 */
function _trackedSpellAttributes(suffix="") {
  return Object.entries(DND5E.spellcasting).reduce((acc, [k, v]) => {
    if ( v.slots ) Array.fromRange(Object.keys(DND5E.spellLevels).length - 1, 1).forEach(l => {
      acc.add(`spells.${v.getSpellSlotKey(l)}${suffix}`);
    });
    return acc;
  }, new Set());
}

/* -------------------------------------------- */

/**
 * Configure which attributes are available for item consumption.
 * @internal
 */
function _configureConsumableAttributes() {
  CONFIG.DND5E.consumableResources = [
    ...Object.keys(DND5E.abilities).map(ability => `abilities.${ability}.value`),
    "attributes.ac.flat",
    "attributes.hp.value",
    "attributes.exhaustion",
    ...Object.keys(DND5E.senses).map(sense => `attributes.senses.ranges.${sense}`),
    ...Object.keys(DND5E.movementTypes).map(type => `attributes.movement.${type}`),
    ...Object.keys(DND5E.currencies).map(denom => `currency.${denom}`),
    "details.xp.value",
    "resources.primary.value", "resources.secondary.value", "resources.tertiary.value",
    "resources.legact.value", "resources.legres.value", "attributes.actions.value",
    ..._trackedSpellAttributes(".value")
  ];
}

/* -------------------------------------------- */

/**
 * Configure additional system fonts.
 */
function _configureFonts() {
  Object.assign(CONFIG.fontDefinitions, {
    Roboto: {
      editor: true,
      fonts: [
        { urls: ["systems/dnd5e/fonts/roboto/Roboto-Regular.woff2"] },
        { urls: ["systems/dnd5e/fonts/roboto/Roboto-Bold.woff2"], weight: "bold" },
        { urls: ["systems/dnd5e/fonts/roboto/Roboto-Italic.woff2"], style: "italic" },
        { urls: ["systems/dnd5e/fonts/roboto/Roboto-BoldItalic.woff2"], weight: "bold", style: "italic" }
      ]
    },
    "Roboto Condensed": {
      editor: true,
      fonts: [
        { urls: ["systems/dnd5e/fonts/roboto-condensed/RobotoCondensed-Regular.woff2"] },
        { urls: ["systems/dnd5e/fonts/roboto-condensed/RobotoCondensed-Bold.woff2"], weight: "bold" },
        { urls: ["systems/dnd5e/fonts/roboto-condensed/RobotoCondensed-Italic.woff2"], style: "italic" },
        {
          urls: ["systems/dnd5e/fonts/roboto-condensed/RobotoCondensed-BoldItalic.woff2"], weight: "bold",
          style: "italic"
        }
      ]
    },
    "Roboto Slab": {
      editor: true,
      fonts: [
        { urls: ["systems/dnd5e/fonts/roboto-slab/RobotoSlab-Regular.ttf"] },
        { urls: ["systems/dnd5e/fonts/roboto-slab/RobotoSlab-Bold.ttf"], weight: "bold" }
      ]
    }
  });
}

/* -------------------------------------------- */

/**
 * Configure system status effects.
 */
function _configureStatusEffects() {
  const addEffect = (effects, {special, ...data}) => {
    data = foundry.utils.deepClone(data);
    data._id = utils.staticID(`dnd5e${data.id}`);
    data.order ??= Infinity;
    effects.push(data);
    if ( special ) CONFIG.specialStatusEffects[special] = data.id;
    if ( data.neverBlockMovement ) DND5E.neverBlockStatuses.add(data.id);
  };
  CONFIG.statusEffects = Object.entries(CONFIG.DND5E.statusEffects).reduce((arr, [id, data]) => {
    const original = CONFIG.statusEffects.find(s => s.id === id);
    addEffect(arr, foundry.utils.mergeObject(original ?? {}, { id, ...data }, { inplace: false }));
    return arr;
  }, []);
  for ( const [id, data] of Object.entries(CONFIG.DND5E.conditionTypes) ) {
    addEffect(CONFIG.statusEffects, { id, ...data });
  }
  for ( const [id, data] of Object.entries(CONFIG.DND5E.encumbrance.effects) ) {
    addEffect(CONFIG.statusEffects, { id, ...data, hud: false });
  }
}

/* -------------------------------------------- */
/*  Foundry VTT Setup                           */
/* -------------------------------------------- */

/**
 * Prepare attribute lists.
 */
Hooks.once("setup", function() {
  // Configure trackable & consumable attributes.
  _configureTrackableAttributes();
  _configureConsumableAttributes();

  CONFIG.DND5E.trackableAttributes = expandAttributeList(CONFIG.DND5E.trackableAttributes);
  game.dnd5e.moduleArt.registerModuleArt();
  Tooltips5e.activateListeners();
  game.dnd5e.tooltips.observe();

  // Register settings after modules have had a chance to initialize
  registerDeferredSettings();

  // Set up compendiums with custom applications & sorting
  setupModulePacks();

  // Create CSS for currencies
  const style = document.createElement("style");
  const currencies = append => Object.entries(CONFIG.DND5E.currencies)
    .map(([key, { icon }]) => `&.${key}${append ?? ""} { background-image: url("${icon}"); }`);
  style.innerHTML = `
    :is(.dnd5e2, .dnd5e2-journal) :is(i, span).currency {
      ${currencies().join("\n")}
    }
    .dnd5e2 .form-group label.label-icon.currency {
      ${currencies("::after").join("\n")}
    }
  `;
  document.head.append(style);
});

/* --------------------------------------------- */

/**
 * Expand a list of attribute paths into an object that can be traversed.
 * @param {string[]} attributes  The initial attributes configuration.
 * @returns {object}  The expanded object structure.
 */
function expandAttributeList(attributes) {
  return attributes.reduce((obj, attr) => {
    foundry.utils.setProperty(obj, attr, true);
    return obj;
  }, {});
}

/* --------------------------------------------- */

/**
 * Perform one-time pre-localization and sorting of some configuration objects
 */
Hooks.once("i18nInit", () => {
  // Set up status effects. Explicitly performed after init and before prelocalization.
  _configureStatusEffects();

  if ( dnd5e.settings.rulesVersion === "legacy" ) {
    const { translations, _fallback } = game.i18n;
    foundry.utils.mergeObject(translations, {
      "TYPES.Item": {
        race: game.i18n.localize("TYPES.Item.raceLegacy"),
        racePl: game.i18n.localize("TYPES.Item.raceLegacyPl")
      },
      DND5E: {
        "Feature.Class.ArtificerPlan": game.i18n.localize("DND5E.Feature.Class.ArtificerInfusion"),
        "Feature.Species": game.i18n.localize("DND5E.Feature.SpeciesLegacy"),
        FlagsAlertHint: game.i18n.localize("DND5E.FlagsAlertHintLegacy"),
        ItemSpeciesDetails: game.i18n.localize("DND5E.ItemSpeciesDetailsLegacy"),
        "Language.Category.Rare": game.i18n.localize("DND5E.Language.Category.Exotic"),
        "MOVEMENT.Type.Speed": game.i18n.localize("DND5E.MOVEMENT.Type.Walk"),
        RacialTraits: game.i18n.localize("DND5E.RacialTraitsLegacy"),
        "REST.Long.Hint.Normal": game.i18n.localize("DND5E.REST.Long.Hint.NormalLegacy"),
        "REST.Long.Hint.Group": game.i18n.localize("DND5E.REST.Long.Hint.GroupLegacy"),
        "Species.Add": game.i18n.localize("DND5E.Species.AddLegacy"),
        "Species.Features": game.i18n.localize("DND5E.Species.FeaturesLegacy"),
        "TARGET.Type.Emanation": foundry.utils.mergeObject(
          _fallback.DND5E?.TARGET?.Type?.Radius ?? {},
          translations.DND5E?.TARGET?.Type?.Radius ?? {},
          { inplace: false }
        ),
        TraitArmorPlural: foundry.utils.mergeObject(
          _fallback.DND5E?.TraitArmorLegacyPlural ?? {},
          translations.DND5E?.TraitArmorLegacyPlural ?? {},
          { inplace: false }
        ),
        TraitArmorProf: game.i18n.localize("DND5E.TraitArmorLegacyProf")
      }
    });
  }
  utils.performPreLocalization(CONFIG.DND5E);
  Object.values(CONFIG.DND5E.activityTypes).forEach(c => c.documentClass.localize());
  Object.values(CONFIG.DND5E.advancementTypes).forEach(c => c.documentClass.localize());
  foundry.helpers.Localization.localizeDataModel(dataModels.settings.CalendarConfigSetting);
  foundry.helpers.Localization.localizeDataModel(dataModels.settings.CalendarPreferencesSetting);
  foundry.helpers.Localization.localizeDataModel(dataModels.settings.TransformationSetting);

  // Spellcasting
  dataModels.spellcasting.SpellcastingModel.fromConfig();
});

/* -------------------------------------------- */
/*  Foundry VTT Ready                           */
/* -------------------------------------------- */

/**
 * Once the entire VTT framework is initialized, check to see if we should perform a data migration
 */
Hooks.once("ready", function() {
  // Wait to register hotbar drop hook on ready so that modules could register earlier if they want to
  Hooks.on("hotbarDrop", (bar, data, slot) => {
    if ( ["ActiveEffect", "Activity", "Item"].includes(data.type) ) {
      documents.macro.create5eMacro(data, slot);
      return false;
    }
  });

  // Adjust sourced items on actors now that compendium UUID redirects have been initialized
  game.actors.forEach(a => a.sourcedItems._redirectKeys());

  // Register items by type
  dnd5e.registry.classes.initialize();
  dnd5e.registry.subclasses.initialize();

  // Chat message listeners
  documents.ChatMessage5e.activateListeners();

  // Bastion initialization
  game.dnd5e.bastion.initializeUI();

  // Display the calendar HUD
  if ( CONFIG.DND5E.calendar.application ) {
    dnd5e.ui.calendar = new CONFIG.DND5E.calendar.application();
    dnd5e.ui.calendar.render({ force: true });
  }

  // Determine whether a system migration is required and feasible
  if ( !game.user.isGM ) return;
  const cv = game.settings.get("dnd5e", "systemMigrationVersion") || game.world.flags.dnd5e?.version;
  const totalDocuments = game.actors.size + game.scenes.size + game.items.size;
  if ( !cv && totalDocuments === 0 ) return game.settings.set("dnd5e", "systemMigrationVersion", game.system.version);
  if ( cv && !foundry.utils.isNewerVersion(game.system.flags.needsMigrationVersion, cv) ) return;

  // Compendium pack folder migration.
  if ( foundry.utils.isNewerVersion("3.0.0", cv) ) {
    migrations.reparentCompendiums("DnD5e SRD Content", "D&D SRD Content");
  }

  // Perform the migration
  if ( cv && foundry.utils.isNewerVersion(game.system.flags.compatibleMigrationVersion, cv) ) {
    ui.notifications.error("MIGRATION.5eVersionTooOldWarning", {localize: true, permanent: true});
  }
  migrations.migrateWorld();
});

/* -------------------------------------------- */
/*  System Styling                              */
/* -------------------------------------------- */

Hooks.on("renderGamePause", (app, html) => {
  if ( Hooks.events.renderGamePause.length > 1 ) return;
  html.classList.add("dnd5e2");
  const container = document.createElement("div");
  container.classList.add("flexcol");
  container.append(...html.children);
  html.append(container);
  const img = html.querySelector("img");
  img.src = "systems/dnd5e/ui/official/ampersand.svg";
  img.className = "";
});

Hooks.on("renderSettings", (app, html) => applications.settings.sidebar.renderSettings(html));

/* -------------------------------------------- */
/*  Other Hooks                                 */
/* -------------------------------------------- */

Hooks.on("applyCompendiumArt", (documentClass, ...args) => documentClass.applyCompendiumArt?.(...args));

Hooks.on("renderChatPopout", documents.ChatMessage5e.onRenderChatPopout);
Hooks.on("getChatMessageContextOptions", documents.ChatMessage5e.addChatMessageContextOptions);

Hooks.on("renderChatLog", (app, html, data) => {
  documents.Item5e.chatListeners(html);
  documents.ChatMessage5e.onRenderChatLog(html);
  documents.Actor5e.chaoticSurgeChatListeners(html);
  documents.Actor5e.eldritchResonanceChatListeners(html);
});
Hooks.on("renderChatPopout", (app, html, data) => {
  documents.Item5e.chatListeners(html);
  documents.Actor5e.chaoticSurgeChatListeners(html);
  documents.Actor5e.eldritchResonanceChatListeners(html);
});

Hooks.on("chatMessage", (app, message, data) => applications.Award.chatMessage(message));
Hooks.on("createChatMessage", dataModels.chatMessage.RequestMessageData.onCreateMessage);
Hooks.on("updateChatMessage", dataModels.chatMessage.RequestMessageData.onUpdateResultMessage);

Hooks.on("renderActorDirectory", (app, html, data) => documents.Actor5e.onRenderActorDirectory(html));

Hooks.on("getActorContextOptions", documents.Actor5e.addDirectoryContextOptions);
Hooks.on("getItemContextOptions", documents.Item5e.addDirectoryContextOptions);

Hooks.on("renderCompendiumDirectory", (app, html) => applications.CompendiumBrowser.injectSidebarButton(html));

Hooks.on("renderJournalEntryPageSheet", applications.journal.JournalEntrySheet5e.onRenderJournalPageSheet);

Hooks.on("renderActiveEffectConfig", documents.ActiveEffect5e.onRenderActiveEffectConfig);

// Eldritch Resonance Table: intercept EA spell casts before any card is posted.
// Returns false to cancel the activity; async gateway is fired without awaiting.
Hooks.on("dnd5e.preUseActivity", (activity, usageConfig, dialogConfig, messageConfig) => {
  if ( !documents.Actor5e._isEldritchArcanumSpell(activity) ) return;
  if ( usageConfig._eldritchResonanceResolved ) return;
  documents.Actor5e._handleEldritchResonancePreUse(activity, usageConfig, dialogConfig, messageConfig);
  return false;
});

// Abyssal Surge: maximize all damage dice for the next EA spell roll.
// Uses postDamageRollConfiguration which fires after any dialog, with actual Roll instances
// before evaluation — so the maximize option is applied regardless of dialog path.
Hooks.on("dnd5e.postDamageRollConfiguration", (rolls, config, dialog, message) => {
  const actor = config.subject?.actor;
  if ( !actor ) return;
  if ( !actor.getFlag("dnd5e", "abyssalSurgePending") ) return;
  if ( config.subject?.item?.system?.school !== "ela" ) return;
  actor.unsetFlag("dnd5e", "abyssalSurgePending");
  for ( const roll of rolls ) {
    const maxValue = Roll.create(roll.formula).evaluateSync({ maximize: true }).total;
    roll.terms = [new foundry.dice.terms.NumericTerm({ number: maxValue })];
    roll.resetFormula();
  }
});

// Eldritch Echo (cantrip): replace damage formulas with the next scaling tier.
// Cantrip scaling uses scaledFormula(increase) with a tier-index, not usageConfig.scaling.
// We call getDamageConfig at the bumped tier so all formula modes (whole/half/custom) are handled
// correctly regardless of the cantrip type. The flag is set in _prepareUsageScaling (mixin.mjs).
Hooks.on("dnd5e.postDamageRollConfiguration", (rolls, config, dialog, message) => {
  const actor = config.subject?.actor;
  if ( !actor ) return;
  if ( !actor.getFlag("dnd5e", "eldritchResonance.cantripEchoActive") ) return;
  actor.unsetFlag("dnd5e", "eldritchResonance.cantripEchoActive");

  const charLevel = actor.system.details?.level ?? 1;
  if ( charLevel >= 17 ) return;

  // scalingIncrease for cantrips = Math.floor((charLevel+1)/6): 0 at 1-4, 1 at 5-10, 2 at 11-16.
  // getDamageConfig accepts a plain number for scaling; scaledFormula unwraps Scaling instances.
  const currentScaling = Math.floor((charLevel + 1) / 6);
  const bumpedConfig = config.subject.getDamageConfig({ scaling: currentScaling + 1 });

  for ( let i = 0; i < rolls.length; i++ ) {
    const parts = bumpedConfig.rolls?.[i]?.parts;
    if ( !parts?.length ) continue;
    const newRoll = new Roll(parts.join(" + "), bumpedConfig.rolls[i]?.data ?? {});
    rolls[i].terms = newRoll.terms;
    rolls[i].resetFormula();
  }
});

// Cosmic Favor: advantage on next spell attack roll.
// preRollAttackV2 is synchronous — set the option, then consume the flag asynchronously in rollAttackV2.
Hooks.on("dnd5e.preRollAttackV2", (config, dialog, message) => {
  const actor = config.subject?.actor;
  if ( !actor ) return;
  if ( !actor.getFlag("dnd5e", "eldritchResonance.advNextSpellAttack") ) return;
  if ( config.subject?.item?.type !== "spell" ) return;
  if ( config.rolls?.[0] ) config.rolls[0].options.advantage = true;
});

Hooks.on("dnd5e.rollAttackV2", (rolls, { subject }) => {
  const actor = subject?.actor;
  if ( !actor ) return;
  if ( !actor.getFlag("dnd5e", "eldritchResonance.advNextSpellAttack") ) return;
  if ( subject?.item?.type !== "spell" ) return;
  actor.unsetFlag("dnd5e", "eldritchResonance.advNextSpellAttack");
});

// Cosmic Favor: disadvantage on the next NPC saving throw (fire-and-forget flag removal).
Hooks.on("dnd5e.preRollSavingThrowV2", (config, dialog, message) => {
  const rollingActor = config.subject;
  if ( !rollingActor || rollingActor.type === "character" ) return;
  const caster = game.actors.find(a => a.type === "character"
    && a.getFlag("dnd5e", "eldritchResonance.disadvNextEnemySave"));
  if ( !caster ) return;
  if ( config.rolls?.[0] ) config.rolls[0].options.disadvantage = true;
  caster.unsetFlag("dnd5e", "eldritchResonance.disadvNextEnemySave");
});

// Cosmic Comedy: advantage on next Charisma-based ability or skill check.
// preRollAbilityCheckV2 fires for both plain checks and skill checks via the shared "abilityCheck" hookName.
Hooks.on("dnd5e.preRollAbilityCheckV2", (config, dialog, message) => {
  const actor = config.subject;
  if ( !actor ) return;
  if ( !actor.getFlag("dnd5e", "eldritchResonance.advNextChaCheck") ) return;
  if ( config.ability !== "cha" ) return;
  if ( config.rolls?.[0] ) config.rolls[0].options.advantage = true;
});

// Consume after a plain Charisma ability check.
Hooks.on("dnd5e.rollAbilityCheck", (rolls, { ability, subject }) => {
  if ( ability !== "cha" ) return;
  if ( !subject?.getFlag("dnd5e", "eldritchResonance.advNextChaCheck") ) return;
  subject.unsetFlag("dnd5e", "eldritchResonance.advNextChaCheck");
  subject.effects.find(e => e.name === "Cosmic Comedy — Adv. next Charisma check")?.delete();
});

// Consume after a Charisma-based skill check.
Hooks.on("dnd5e.rollSkillV2", (rolls, { ability, subject }) => {
  if ( ability !== "cha" ) return;
  if ( !subject?.getFlag("dnd5e", "eldritchResonance.advNextChaCheck") ) return;
  subject.unsetFlag("dnd5e", "eldritchResonance.advNextChaCheck");
  subject.effects.find(e => e.name === "Cosmic Comedy — Adv. next Charisma check")?.delete();
});

// Temporal Distortion: outside combat, the extra-action AE expires after any activity is used.
// In combat it expires naturally after 1 turn; outside combat duration never ticks.
// Skip the ER-resolved refire itself (which is what grants the effect, not what consumes it).
Hooks.on("dnd5e.postUseActivity", (activity, usageConfig, results) => {
  const actor = activity.item?.actor;
  if ( !actor || actor.inCombat ) return;
  if ( usageConfig._eldritchResonanceResolved ) return;
  const tdEffects = actor.effects.filter(e => e.name === "Temporal Distortion — Extra Action");
  for ( const eff of tdEffects ) eff.delete();
});

// Eldritch Madness ability hooks: risk rolls, Prescient Dodge consequence, Chaotic Surge.
Hooks.on("dnd5e.postUseActivity", (activity, usageConfig, results) => {
  const actor = activity.item?.actor;
  if ( !actor ) return;

  // Risk roll for flagged abilities (Eldritch Empowerment, Abyssal Echo, etc.)
  const riskConfig = activity.item.getFlag("dnd5e", "eldritchMadnessAbility");
  if ( riskConfig ) {
    documents.Actor5e.rollEldritchMadnessRisk(actor, riskConfig);
    return;
  }

  // Prescient Dodge: auto-roll DC 15 Wisdom consequence save.
  if ( activity.item.getFlag("dnd5e", "prescientDodgeConsequence") ) {
    documents.Actor5e.rollPrescientDodgeConsequence(actor);
    return;
  }

  // Chaotic Surge: auto-roll d6 on spell cast or weapon attack.
  const hasChaoticSurge = actor.items.some(i => i.getFlag("dnd5e", "chaoticSurge"));
  if ( hasChaoticSurge ) documents.Actor5e.rollChaoticSurge(actor, activity);
});

// --- Vortex Damage Effects: Mental Echo + Soul Erosion ---

// Per-round vortex damage tracker for Soul Erosion: actorUuid → { round, total, triggered }.
const _vortexRoundTracker = new Map();

/**
 * Resolve the Mental Echo save DC from the originating chat message.
 *
 * Resolution order:
 *  1. Item-level override — `dnd5e.vortexDC` flag on the used item (e.g., a magical weapon with its own DC).
 *  2. Spell — caster's spell save DC (`system.attributes.spell.dc`).
 *  3. NPC / monster — 8 + proficiency bonus + max(Wis mod, Cha mod).
 *  4. PC using a non-spell item — falls back to the PC's spell save DC.
 *  5. No resolvable attacker → returns null (Mental Echo is skipped).
 *
 * @param {ChatMessage|null} origin  The originating damage chat message from `options.origin`.
 * @returns {number|null}            Resolved DC, or null if Mental Echo should not apply.
 */
function _resolveVortexDC(origin) {
  if ( !origin ) return null;
  const msgFlags = origin.flags?.dnd5e ?? {};
  const attacker = ChatMessage.getSpeakerActor(origin.speaker);
  if ( !attacker ) return null;

  // Item-level fixed DC override (set via `dnd5e.vortexDC` flag on the item, e.g. Blade of the Eldritch King).
  const item = msgFlags.item?.uuid ? fromUuidSync(msgFlags.item.uuid) : null;
  const fixedDC = item?.getFlag("dnd5e", "vortexDC");
  if ( fixedDC ) return Number(fixedDC);

  // Spell: use caster's configured spell save DC.
  if ( msgFlags.item?.type === "spell" ) return attacker.system.attributes.spell.dc ?? null;

  // NPC / monster: 8 + proficiency + max(Wis, Cha) — eldritch ability for extraplanar creatures.
  if ( attacker.type !== "character" ) {
    const prof = attacker.system.attributes.prof ?? 0;
    const wisMod = attacker.system.abilities?.wis?.mod ?? 0;
    const chaMod = attacker.system.abilities?.cha?.mod ?? 0;
    return 8 + prof + Math.max(wisMod, chaMod);
  }

  // PC with a non-spell item (weapon, feat, etc.): fall back to spell save DC.
  return attacker.system.attributes.spell.dc ?? null;
}

// After damage is calculated (post-resistance), store vortex subtotal and resolved DC in options
// so the applyDamage hook can act on them without re-walking the damages array.
Hooks.on("dnd5e.calculateDamage", (actor, damages, options) => {
  const vortexTotal = damages
    .filter(d => d.type === "vortex")
    .reduce((sum, d) => sum + (d.value ?? 0), 0);
  if ( vortexTotal <= 0 ) return;
  options._vortexAmount = Math.trunc(vortexTotal);
  options._vortexDC = _resolveVortexDC(options.origin ?? null);
});

// After vortex damage is applied: run Soul Erosion and prompt Mental Echo WIS save.
Hooks.on("dnd5e.applyDamage", async (actor, amount, options) => {
  const vortexAmount = options._vortexAmount;
  if ( !vortexAmount || vortexAmount <= 0 ) return;

  // Soul Erosion: only tracks in active combat; one trigger per actor per round.
  if ( game.combat?.active ) {
    const round = game.combat.round;
    const key = actor.uuid;
    const existing = _vortexRoundTracker.get(key);
    const roundTotal = (existing?.round === round ? existing.total : 0) + vortexAmount;
    const triggered = existing?.round === round ? existing.triggered : false;
    _vortexRoundTracker.set(key, { round, total: roundTotal, triggered });
    if ( !triggered && roundTotal > Math.floor(actor.system.attributes.hp.max / 2) ) {
      _vortexRoundTracker.set(key, { round, total: roundTotal, triggered: true });
      const currentMadness = actor.system.attributes.eldritchMadness ?? 0;
      const maxMadness = CONFIG.DND5E.conditionTypes.eldritchMadness?.levels ?? 6;
      if ( currentMadness < maxMadness ) {
        await actor.update({ "system.attributes.eldritchMadness": currentMadness + 1 });
        ChatMessage.create({
          content: `<p><strong>${actor.name}</strong> gains a level of Eldritch Madness from Soul Erosion! (Level ${currentMadness + 1})</p>`,
          speaker: ChatMessage.getSpeaker({ actor })
        });
      }
    }
  }

  // Mental Echo: auto-roll WIS saving throw, DC = caster's spell save DC.
  const dc = options._vortexDC;
  if ( !dc ) return;
  const saveRolls = await actor.rollSavingThrow({ ability: "wis", target: dc }, { configure: false });
  const saveRoll = saveRolls?.[0];
  if ( !saveRoll || saveRoll.total >= dc ) return;

  // Failed save: impose disadvantage on the next WIS or INT check or save before end of next turn.
  await actor.setFlag("dnd5e", "mentalEchoPending", true);
  await actor.createEmbeddedDocuments("ActiveEffect", [{
    name: "Mental Echo — Disadv. next Wis/Int check or save",
    img: "systems/dnd5e/icons/svg/statuses/eldritch-madness.svg",
    origin: options.origin?.uuid,
    duration: { turns: 1 },
    "flags.dnd5e.mentalEcho": true
  }]);
});

// Mental Echo: apply disadvantage to the next WIS or INT saving throw.
Hooks.on("dnd5e.preRollSavingThrowV2", (config, dialog, message) => {
  const actor = config.subject;
  if ( !actor || !["wis", "int"].includes(config.ability) ) return;
  if ( !actor.getFlag("dnd5e", "mentalEchoPending") ) return;
  if ( config.rolls?.[0] ) config.rolls[0].options.disadvantage = true;
});

// Mental Echo: apply disadvantage to the next WIS or INT ability or skill check.
Hooks.on("dnd5e.preRollAbilityCheckV2", (config, dialog, message) => {
  const actor = config.subject;
  if ( !actor || !["wis", "int"].includes(config.ability) ) return;
  if ( !actor.getFlag("dnd5e", "mentalEchoPending") ) return;
  if ( config.rolls?.[0] ) config.rolls[0].options.disadvantage = true;
});

// Consume Mental Echo after WIS or INT saving throw.
Hooks.on("dnd5e.rollSavingThrow", (rolls, { ability, subject }) => {
  if ( !["wis", "int"].includes(ability) ) return;
  if ( !subject?.getFlag("dnd5e", "mentalEchoPending") ) return;
  subject.unsetFlag("dnd5e", "mentalEchoPending");
  subject.effects.find(e => e.getFlag("dnd5e", "mentalEcho"))?.delete();
});

// Consume Mental Echo after WIS or INT plain ability check.
Hooks.on("dnd5e.rollAbilityCheck", (rolls, { ability, subject }) => {
  if ( !["wis", "int"].includes(ability) ) return;
  if ( !subject?.getFlag("dnd5e", "mentalEchoPending") ) return;
  subject.unsetFlag("dnd5e", "mentalEchoPending");
  subject.effects.find(e => e.getFlag("dnd5e", "mentalEcho"))?.delete();
});

// Consume Mental Echo after WIS or INT skill check.
Hooks.on("dnd5e.rollSkillV2", (rolls, { ability, subject }) => {
  if ( !["wis", "int"].includes(ability) ) return;
  if ( !subject?.getFlag("dnd5e", "mentalEchoPending") ) return;
  subject.unsetFlag("dnd5e", "mentalEchoPending");
  subject.effects.find(e => e.getFlag("dnd5e", "mentalEcho"))?.delete();
});

// EM sentinel family: any AE with one of the following dnd5e flags fires immediately, updates
// system.attributes.eldritchMadness (or exhaustion), then self-deletes. Flags:
//   eldritchMadnessSentinel: true   — add eldritchMadnessGain (default 1, negative = remove)
//   eldritchMadnessClearAll: true   — set EM to 0 (full cleanse, e.g. Eldritch Reversal fail)
//   eldritchMadnessHalve: true      — set EM to floor(current / 2) (Reversal success)
//   exhaustionGain: N               — add N levels of exhaustion (capped at 6)
Hooks.on("createActiveEffect", (effect, options, userId) => {
  const actor = effect.parent;
  if ( !(actor instanceof Actor) ) return;
  if ( game.user.id !== userId ) return;

  if ( effect.getFlag("dnd5e", "eldritchMadnessSentinel") ) {
    const gain = effect.getFlag("dnd5e", "eldritchMadnessGain") ?? 1;
    const current = actor.system.attributes.eldritchMadness ?? 0;
    const max = CONFIG.DND5E.conditionTypes.eldritchMadness?.levels ?? 6;
    const newLevel = Math.min(Math.max(0, current + gain), max);
    if ( newLevel !== current ) {
      actor.update({ "system.attributes.eldritchMadness": newLevel });
      const delta = newLevel - current;
      const msg = delta > 0
        ? `gains ${delta} level(s) of Eldritch Madness! (Now level ${newLevel})`
        : `loses ${Math.abs(delta)} level(s) of Eldritch Madness. (Now level ${newLevel})`;
      ChatMessage.create({ content: `<p><strong>${actor.name}</strong> ${msg}</p>`, speaker: ChatMessage.getSpeaker({ actor }) });
    }
    effect.delete();
    return;
  }

  if ( effect.getFlag("dnd5e", "eldritchMadnessClearAll") ) {
    const current = actor.system.attributes.eldritchMadness ?? 0;
    if ( current > 0 ) {
      actor.update({ "system.attributes.eldritchMadness": 0 });
      ChatMessage.create({ content: `<p><strong>${actor.name}</strong> loses all ${current} level(s) of Eldritch Madness!</p>`, speaker: ChatMessage.getSpeaker({ actor }) });
    }
    effect.delete();
    return;
  }

  if ( effect.getFlag("dnd5e", "eldritchMadnessHalve") ) {
    const current = actor.system.attributes.eldritchMadness ?? 0;
    const newLevel = Math.floor(current / 2);
    if ( newLevel < current ) {
      actor.update({ "system.attributes.eldritchMadness": newLevel });
      ChatMessage.create({ content: `<p><strong>${actor.name}</strong> loses ${current - newLevel} level(s) of Eldritch Madness. (Now level ${newLevel})</p>`, speaker: ChatMessage.getSpeaker({ actor }) });
    }
    effect.delete();
    return;
  }

  if ( effect.getFlag("dnd5e", "exhaustionGain") ) {
    const gain = effect.getFlag("dnd5e", "exhaustionGain");
    const current = actor.system.attributes.exhaustion ?? 0;
    const newLevel = Math.min(current + gain, 6);
    if ( newLevel > current ) {
      actor.update({ "system.attributes.exhaustion": newLevel });
      ChatMessage.create({ content: `<p><strong>${actor.name}</strong> gains ${newLevel - current} level(s) of exhaustion. (Now level ${newLevel})</p>`, speaker: ChatMessage.getSpeaker({ actor }) });
    }
    effect.delete();
  }
});

Hooks.on("renderDocumentSheetConfig", (app, html) => {
  const { document } = app.options;
  if ( (document instanceof Actor) && document.system.isGroup ) {
    applications.actor.MultiActorSheet.addDocumentSheetConfigOptions(app, html);
  }
});

Hooks.on("targetToken", canvas.Token5e.onTargetToken);

Hooks.on("renderCombatTracker", (app, html, data) => app.renderGroups(html));

Hooks.on("preCreateScene", (doc, createData, options, userId) => {
  // Set default grid units based on metric length setting
  const units = utils.defaultUnits("length");
  if ( (units !== dnd5e.grid.units) && !foundry.utils.getProperty(createData, "grid.distance")
    && !foundry.utils.getProperty(createData, "grid.units") ) {
    doc.updateSource({
      grid: { distance: utils.convertLength(dnd5e.grid.distance, dnd5e.grid.units, units, { strict: false }), units }
    });
  }
});

Hooks.on("updateWorldTime", (...args) => {
  dataModels.calendar.CalendarData5e.onUpdateWorldTime(...args);
  CONFIG.DND5E.calendar.application?.onUpdateWorldTime?.(...args);
});

/* -------------------------------------------- */
/*  Bundled Module Exports                      */
/* -------------------------------------------- */

export {
  applications,
  canvas,
  dataModels,
  dice,
  documents,
  enrichers,
  Filter,
  migrations,
  registry,
  utils,
  DND5E
};
