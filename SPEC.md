# Podcast Annotation Format

**Version 1.0.0**

A minimal JSON format for timestamped entity annotations on podcast and spoken media content.

## Overview

WebVTT tells you what was said. Podcast annotations tell you what was said *about*.

Transcripts give you words and timestamps. But when a host mentions a 1969 Camaro at 0:45, a turbocharger at 2:00, or Carroll Shelby at 3:15, that meaning is invisible to apps. It's not structured, not linkable, and difficult to extract reliably after the fact.

The Podcast Annotation Format is a simple, open JSON spec for timestamped entity annotations on audio. Annotation sets can be produced by humans, automated pipelines, or hybrid workflows. Transcripts made podcasts searchable. Annotations make them understandable.

### Design Principles

- **Minimal.** Only two required fields (`startTime`, `endTime`). Everything else is optional.
- **Extensible.** The `data` object is an open extension point for app-specific metadata.
- **Framework-agnostic.** Plain JSON. No JSON-LD, no XML, no runtime dependencies.
- **Human-readable.** A developer should understand an annotation file without reading this spec.

## Prior Art & Inspiration

Timestamped annotation on media is a proven pattern. It works, it scales, and podcasting is the missing piece.

**Proven UX pattern:**
- **VH1 Pop-Up Video.** The original mainstream example: timestamped contextual notes overlaid on media playback.
- **Amazon Prime Video X-Ray.** Cast, characters, and trivia synced to the current scene. The canonical modern implementation.
- **YouTube Info Cards.** Lightweight timed overlays linking to related content mid-video.
- **SoundCloud timed comments.** One of the earliest mainstream timestamped annotations on audio. Users drop comments at any `t=` position, proving listeners engage with moment-level audio annotation.

**Proven at scale:**
- **Genius.** Community annotation layer on lyrics, proving that entity-level annotation on media content is a viable product at scale. Structurally the closest analog: annotation body attached to a media anchor, with a URL for more context.
- **BBC Linked Data.** Around 2012-2016 the BBC built the most serious real-world deployment of entity annotation on broadcast content, tagging people, places, and topics against their audio and video archive using their `programmes` ontology. The closest institutional precedent.

**Proven in podcasting:**
- **Podcast chapters** (Podcasting 2.0, Podlove, MP4). Coarse timestamped metadata that podcast apps already implement, proving the ecosystem will adopt spec extensions that improve the listening experience.
- **Overcast.** Podcast-native precedent for structured metadata (Smart Speed, chapters, transcript sync) improving UX. Marco Arment's public discussion of DAI transcript synchronization informed this spec's approach to ad break alignment.
- **Snipd.** A podcast app that lets listeners highlight and annotate moments for personal note-taking. Listener-side annotation on podcast audio, already in production. This spec makes the same capability possible as an open, shared layer rather than a closed, personal tool.

Podcast audio already contains this information. What's missing is a way to represent it as structured data. This spec defines a format that makes it possible. While annotations can be derived from transcripts, precomputed annotations enable more accurate timing, higher-quality entity resolution, and consistent cross-platform behavior.

## Annotation Object

An annotation represents a single entity mention or topic reference in audio. An annotation's time range represents the duration over which the entity is actively discussed or relevant, not just the exact moment it is first mentioned.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string \| number` | No | Unique identifier within the annotation set |
| `startTime` | `number` | **Yes** | Start time in seconds (float) |
| `endTime` | `number` | **Yes** | End time in seconds (float) |
| `type` | `string` | No | Entity type (see [Recommended Types](#recommended-entity-types)) |
| `title` | `string` | No | Human-readable display label |
| `url` | `string` | No | URL to more information about the entity |
| `image` | `string` | No | URL to an image representing the entity |
| `speaker` | `string` | No | Speaker ID (references an entry in `speakers`) |
| `quote` | `string` | No | The exact words from the transcript that triggered this annotation |
| `tags` | `array of strings` | No | Freeform labels for search, clustering, and filtering |
| `priority` | `number` | No | Editorial importance from 0.0 to 1.0, for UI display ordering |
| `canonicalId` | `string` | No | Stable entity identifier for cross-episode deduplication |
| `confidence` | `number` | No | Confidence score from 0.0 to 1.0 |
| `source` | `string` | No | How the annotation was produced (e.g., `"human"`, `"ai"`, `"hybrid"`) |
| `data` | `object` | No | Arbitrary extension metadata |

Typical usage:

```json
{
  "startTime": 45.2,
  "endTime": 75.0,
  "type": "car",
  "title": "LS Engine",
  "url": "https://example.com/ls-engine",
  "speaker": "s1",
  "quote": "the LS is just a completely different animal"
}
```

Full example with all optional fields:

```json
{
  "id": "ls-engine-1",
  "startTime": 45.2,
  "endTime": 75.0,
  "type": "car",
  "title": "LS Engine",
  "url": "https://example.com/ls-engine",
  "image": "https://example.com/ls-engine.jpg",
  "speaker": "s1",
  "quote": "the LS is just a completely different animal",
  "tags": ["engine", "swap", "performance"],
  "priority": 0.9,
  "canonicalId": "car:chevrolet:ls",
  "confidence": 0.95,
  "source": "ai",
  "data": {
    "make": "Chevrolet",
    "displacement": "5.7L"
  }
}
```

### Time Format

All times are in **seconds as floating-point numbers**, measured from the start of the audio. This aligns with the Web Audio API, HTMLMediaElement, WebVTT, and most podcast tooling.

Time values SHOULD use millisecond precision (e.g., `45.123`). Consumers SHOULD tolerate minor floating-point variance (e.g., treat `45.1999` and `45.2` as equivalent).

### The `data` Field

The `data` object is an open extension point. Producers can store any JSON-serializable metadata here. Consumers should ignore fields they don't recognize.

Common uses:
- Domain-specific attributes (make, model, year for cars)
- Rendering hints (color, icon, priority)
- Additional provenance or source metadata beyond `confidence` and `source`

### Identifiers

If provided, `id` MUST be unique within the annotation set. IDs SHOULD be stable across revisions of the same annotation set to support diffing, syncing, and caching. IDs MAY be strings or numbers, but producers SHOULD prefer strings for consistency.

### Ordering and Overlaps

Annotations SHOULD be sorted by `startTime` in ascending order. Consumers MUST NOT rely on ordering and SHOULD sort if necessary.

Annotations MAY overlap in time. Multiple annotations at the same timestamp are valid. A single moment might reference both a car and the person driving it. Implementations should define rendering behavior for overlapping annotations, such as stacking, prioritizing by type or confidence, or limiting simultaneous display.

### Validation Rules

- `startTime` MUST be >= 0
- `endTime` MUST be >= `startTime`
- `confidence`, if provided, MUST be >= 0.0 and <= 1.0. This reflects extraction certainty: how sure the producer is that this annotation is correct.
- `priority`, if provided, MUST be >= 0.0 and <= 1.0. This reflects editorial importance: how prominently this annotation should be displayed. A high-confidence annotation may still have low priority if it's tangential.
- `speaker`, if provided, MUST reference a valid `id` in the `speakers` array
- Time values SHOULD be within the duration of the associated audio

### Canonical IDs

The `canonicalId` field provides a stable, human-readable identifier for the underlying entity, not the annotation itself. The same entity across multiple episodes or annotation sets SHOULD use the same `canonicalId`, enabling cross-episode deduplication, entity graphs, and aggregate views (e.g., "every episode that mentions the LS engine").

There is no required format, but a namespaced convention is recommended:

- `car:chevrolet:camaro:1969`
- `person:carroll-shelby`
- `place:nurburgring`

Producers MAY also use external identifiers such as Wikidata QIDs (e.g., `wikidata:Q332448`).

## Annotation Set

An annotation set is the container format for a collection of annotations associated with a single episode or audio file.

```json
{
  "version": "1.0.0",
  "episode": {
    "title": "Cars That Need A Comeback (A-M), The Fourth Car, Minivan Peer Pressure | Episode 1,013",
    "url": "https://getcarcurious.com/episodes/cars-that-need-a-comeback-a-m-the-fourth-car-minivan-peer-pressure-episode-1-013",
    "audioUrl": "https://traffic.megaphone.fm/EDLLC3477736751.mp3"
  },
  "speakers": [
    { "id": "paul", "name": "Paul Zarella", "role": "host" },
    { "id": "todd", "name": "Todd Deeken", "role": "host" }
  ],
  "annotations": [
    {
      "startTime": 53.12,
      "endTime": 57.6,
      "type": "car",
      "title": "Honda Prelude"
    },
    {
      "startTime": 898.24,
      "endTime": 902.96,
      "type": "car",
      "title": "Toyota Supra"
    }
  ]
}
```

### Container Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `version` | `string` | **Yes** | Spec version (semver, currently `"1.0.0"`) |
| `episode` | `object` | No | Episode metadata |
| `episode.title` | `string` | No | Episode title |
| `episode.url` | `string` | No | Episode web page |
| `episode.audioUrl` | `string` | No | URL to the audio file |
| `transcripts` | `array` | No | Transcript files (see [Transcripts](#transcripts)) |
| `speakers` | `array` | No | Speaker definitions (see [Speakers](#speakers)) |
| `adBreaks` | `array` | No | Ad/insertion break ranges (see [Ad Breaks](#ad-breaks)) |
| `annotations` | `array` | **Yes** | Array of annotation objects |

The `episode` object is optional. When annotations are delivered alongside audio (e.g., via RSS or an API), episode metadata may be redundant. For episode-level prose metadata (show notes, descriptions), see Schema.org `PodcastEpisode`.

## Transcripts

The `transcripts` array links to transcript files associated with the audio. Multiple formats can be provided.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `url` | `string` | **Yes** | URL to the transcript file |
| `format` | `string` | **Yes** | File format: `"vtt"`, `"srt"`, or `"json"` |
| `language` | `string` | No | BCP 47 language tag (e.g., `"en"`, `"es"`) |

```json
{
  "transcripts": [
    { "url": "https://example.com/ep42.vtt", "format": "vtt", "language": "en" },
    { "url": "https://example.com/ep42.srt", "format": "srt", "language": "en" }
  ]
}
```

## Speakers

The `speakers` array defines the people speaking in the audio. Annotations reference speakers by `id`.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | **Yes** | Unique identifier referenced by annotations |
| `name` | `string` | **Yes** | Display name |
| `role` | `string` | No | Role in the episode (see recommended values below) |
| `url` | `string` | No | URL to the speaker's profile or website |

```json
{
  "speakers": [
    { "id": "paul", "name": "Paul Zarella", "role": "host" },
    { "id": "todd", "name": "Todd Deeken", "role": "host" }
  ]
}
```

**Recommended roles:** `"host"`, `"guest"`, `"narrator"`, `"caller"`, `"correspondent"`. Custom roles should use lowercase. Consistent role values across implementations improve interoperability.

Speaker IDs are opaque strings. Use short, stable identifiers (e.g., `"s1"`, `"matt-farah"`). The same speaker across episodes should use the same ID to enable cross-episode analysis.

## Ad Breaks

The `adBreaks` array defines time ranges where dynamically inserted content (ads, promos, sponsorships) appears. This is separate from annotations to keep the semantic distinction clean: ad breaks are structural holes in the content, not entity references.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `startTime` | `number` | **Yes** | Start time in seconds |
| `endTime` | `number` | **Yes** | End time in seconds |
| `label` | `string` | No | Type of insertion (e.g., `"ad"`, `"promo"`, `"sponsorship"`) |
| `position` | `string` | No | Placement: `"pre-roll"`, `"mid-roll"`, or `"post-roll"` |

```json
{
  "adBreaks": [
    { "startTime": 120.0, "endTime": 150.0, "label": "ad", "position": "mid-roll" },
    { "startTime": 600.0, "endTime": 630.0, "label": "promo", "position": "mid-roll" }
  ]
}
```

Players can use ad breaks to skip or realign annotations around dynamic ad insertion. When the audio variant differs from the canonical recording (different ads stitched in at different times), the ad break ranges describe where the inserted content lives.

**Overlapping annotations:** When an annotation's time range overlaps with an ad break, behavior is player-defined. A player might pause the annotation during the ad and resume after, skip the annotation entirely, or extend it past the break. This spec does not mandate a specific behavior. Implementations should document their approach.

## Recommended Entity Types

The following types are proven in production and recommended for interoperability. This list is not exhaustive; producers may use any string value for `type`.

| Type | Description | Example |
|------|-------------|---------|
| `car` | A specific car, truck, or vehicle | "1967 Ford Mustang" |
| `part` | A vehicle or mechanical component | "Turbocharger", "LS3 crate engine" |
| `term` | A technical or domain-specific term | "Oversteer", "Forced induction" |
| `concept` | A broader topic or idea | "Electrification", "Motorsport safety" |
| `brand` | A company or brand name | "Brembo", "Michelin" |
| `person` | A person referenced in the content | "Carroll Shelby", "Ayrton Senna" |
| `place` | A location or venue | "Nurburgring", "Bonneville Salt Flats" |

All type values use **lowercase**. Producers SHOULD use recommended types when applicable to maximize interoperability. Single words are preferred for common types. Custom types SHOULD be hyphenated (e.g., `"race-series"`, `"engine-code"`).

## File Extension and MIME Type

| | Recommendation |
|--|----------------|
| File extension | `.annotations.json` |
| MIME type | `application/json` |

## Examples

### Automotive Podcast

From [The Everyday Driver Podcast](https://getcarcurious.com), Episode 1,013 (113 annotations across ~97 minutes):

```json
{
  "version": "1.0.0",
  "episode": {
    "title": "Cars That Need A Comeback (A-M), The Fourth Car, Minivan Peer Pressure | Episode 1,013",
    "url": "https://getcarcurious.com/episodes/cars-that-need-a-comeback-a-m-the-fourth-car-minivan-peer-pressure-episode-1-013",
    "audioUrl": "https://traffic.megaphone.fm/EDLLC3477736751.mp3"
  },
  "speakers": [
    { "id": "paul", "name": "Paul Zarella", "role": "host" },
    { "id": "todd", "name": "Todd Deeken", "role": "host" }
  ],
  "annotations": [
    {
      "startTime": 53.12,
      "endTime": 57.6,
      "type": "car",
      "title": "Honda Prelude",
      "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/1982_Honda_Prelude_%2815977118997%29.jpg/1200px-1982_Honda_Prelude_%2815977118997%29.jpg",
      "data": {
        "imageAttribution": "Riley from Christchurch, New Zealand (CC BY 2.0)"
      }
    },
    {
      "startTime": 145.1,
      "endTime": 145.1,
      "type": "part",
      "title": "solenoid handles",
      "data": {
        "explanation": "Electronic door handles that use a solenoid mechanism to lock and unlock. Common in modern EVs, they can malfunction if jammed or stuck."
      }
    },
    {
      "startTime": 760.6,
      "endTime": 773.0,
      "type": "company",
      "title": "FCP Euro",
      "data": {
        "explanation": "Supplier of automotive parts specializing in genuine OE and aftermarket performance upgrades for European vehicles."
      }
    },
    {
      "startTime": 898.2,
      "endTime": 901.0,
      "type": "term",
      "title": "2JZ engine",
      "data": {
        "explanation": "A 3.0-liter inline-six engine produced by Toyota, famous for its strength and tuning potential. Most well-known for powering the Toyota Supra Mark IV."
      }
    },
    {
      "startTime": 898.24,
      "endTime": 902.96,
      "type": "car",
      "title": "Toyota Supra",
      "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/D%C3%BClmen%2C_Auto_Bertels%2C_Toyota_GR_Supra_--_2021_--_9558.jpg/1200px-D%C3%BClmen%2C_Auto_Bertels%2C_Toyota_GR_Supra_--_2021_--_9558.jpg",
      "data": {
        "imageAttribution": "Dietmar Rabich (CC BY-SA 4.0)"
      }
    }
  ]
}
```

The full 113-annotation file is available at [`examples/everyday-driver-episode-1013.annotations.json`](examples/everyday-driver-episode-1013.annotations.json).

### General Podcast (Interview)

```json
{
  "version": "1.0.0",
  "episode": {
    "title": "Climate Tech with Dr. Sarah Chen"
  },
  "speakers": [
    { "id": "host", "name": "Alex Rivera", "role": "host" },
    { "id": "guest", "name": "Dr. Sarah Chen", "role": "guest" }
  ],
  "annotations": [
    {
      "startTime": 30.0,
      "endTime": 55.0,
      "type": "person",
      "title": "Dr. Sarah Chen",
      "url": "https://example.com/guests/sarah-chen"
    },
    {
      "startTime": 120.0,
      "endTime": 180.0,
      "type": "concept",
      "title": "Carbon capture and storage",
      "url": "https://en.wikipedia.org/wiki/Carbon_capture_and_storage",
      "speaker": "guest",
      "quote": "we're pulling CO2 directly from the atmosphere"
    },
    {
      "startTime": 300.0,
      "endTime": 330.0,
      "type": "brand",
      "title": "Climeworks",
      "url": "https://climeworks.com",
      "speaker": "guest"
    },
    {
      "startTime": 450.0,
      "endTime": 480.0,
      "type": "place",
      "title": "Orca Plant, Iceland",
      "speaker": "host",
      "data": {
        "lat": 64.0,
        "lng": -21.4
      }
    }
  ]
}
```

## W3C Web Annotation Mapping

Podcast annotations can be expressed as [W3C Web Annotations](https://www.w3.org/TR/annotation-model/) for interoperability with standards-compliant tools. The mapping uses [Media Fragments](https://www.w3.org/TR/media-frags/) for temporal targeting.

A podcast annotation:

```json
{
  "startTime": 53.12,
  "endTime": 57.6,
  "type": "car",
  "title": "Honda Prelude"
}
```

Maps to this W3C Web Annotation:

```json
{
  "@context": "http://www.w3.org/ns/anno.jsonld",
  "type": "Annotation",
  "body": {
    "type": "TextualBody",
    "value": "Honda Prelude",
    "purpose": "describing",
    "format": "text/plain"
  },
  "target": {
    "source": "https://traffic.megaphone.fm/EDLLC3477736751.mp3",
    "selector": {
      "type": "FragmentSelector",
      "conformsTo": "http://www.w3.org/TR/media-frags/",
      "value": "t=53.12,57.6"
    }
  }
}
```

### Mapping Rules

| Podcast Annotation Field | W3C Web Annotation |
|-----------|--------------------|
| `startTime`, `endTime` | `target.selector.value` as `t=start,end` |
| `title` | `body.value` |
| `type` | Custom `body.type` or encoded within `body.purpose`, depending on implementation |
| `url` | Additional `body` with `purpose: "linking"` |
| `image` | Additional `body` with `purpose: "depicting"` |
| `quote` | `body[1]` with `purpose: "quoting"` |
| `speaker` | May be represented via `creator` or external metadata in W3C systems |
| `confidence` | Not mapped (application-specific) |
| `data` | Not mapped (application-specific) |
| `episode.audioUrl` | `target.source` |

> **Note:** The W3C mapping requires `episode.audioUrl` to populate `target.source`. Annotation sets without `episode.audioUrl` cannot produce complete W3C Web Annotations.

## Relationship to Other Standards

**Podcasting 2.0 Chapters.** Chapters define coarse segments (intro, topic, outro) with titles and artwork. Podcast annotations are fine-grained entity references within those segments. They're complementary: an episode might have 5 chapters and 40 annotations.

**WebVTT / SRT.** Subtitle formats carry the transcript text. This spec carries the entities and topics referenced in that text. A player might use WebVTT for the transcript and podcast annotations for contextual overlays.

**Schema.org PodcastEpisode.** Schema.org defines episode-level metadata for search engines. This spec defines within-episode annotations. A `PodcastEpisode` might link to an `.annotations.json` file via a custom property.

**Podcasting 2.0 `<podcast:person>`.** Tags people at the episode level (hosts, guests). Podcast annotations with `type: "person"` tag people at the moment level: when they're discussed, not just who's on the show.

**RSS Distribution.** An episode's annotation file MAY be referenced from the RSS feed or episode web page. A future `<podcast:annotations>` namespace element could formalize this. See the Podcasting 2.0 namespace for the proposal process.

**Wikidata / DBpedia.** The `url` field on annotations can reference Wikidata entities (e.g., `https://www.wikidata.org/wiki/Q5300`) for canonical, language-independent entity identification. This enables linked data use cases without adding complexity to the core format.

## Reference Implementation

[podcast-annotations](https://github.com/Car-Curious/podcast-annotations-js) is a framework-agnostic JavaScript library for rendering podcast annotations with audio players. It supports annotation overlays, transcript sync, timelines, chapters, and DAI alignment.

This format was developed by [Car Curious](https://getcarcurious.com), a podcast annotation platform for automotive content, and is released as an open specification for the broader podcast ecosystem.

## License

This specification is released under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
