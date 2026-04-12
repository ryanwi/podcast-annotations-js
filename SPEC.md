# Podcast Annotation Format

**Version 1.0.0**

A minimal JSON format for timestamped entity annotations on podcast and spoken media content.

## Overview

Podcasts reference people, places, products, and concepts — but there is no standard way to represent those references as structured, timed data. This spec defines a simple JSON format for attaching annotations to moments in audio, enabling players, apps, and tools to build rich experiences on top of spoken content.

### Design Principles

- **Minimal** — only two required fields (`startTime`, `endTime`). Everything else is optional.
- **Extensible** — the `data` object is an open extension point for app-specific metadata.
- **Framework-agnostic** — plain JSON. No JSON-LD, no XML, no runtime dependencies.
- **Human-readable** — a developer should understand an annotation file without reading this spec.

## Prior Art & Inspiration

Timestamped media annotation is a proven pattern across video and music:

- **Amazon Prime Video X-Ray** — surfaces cast, characters, and trivia synced to the current scene. The canonical modern implementation of entity annotation on media.
- **VH1 Pop-Up Video** — the original mainstream example: timestamped contextual notes overlaid on music video playback.
- **YouTube Info Cards** — lightweight timed overlays linking to related content mid-video.
- **Genius** — community annotation layer on lyrics, proving that entity-level annotation on media content is a viable product at scale.

Podcast audio has no equivalent. This is the data format that makes it possible.

## Annotation Object

An annotation represents a single entity mention or topic reference at a specific moment in audio.

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
| `confidence` | `number` | No | Confidence score from 0.0 to 1.0 |
| `source` | `string` | No | How the annotation was produced (e.g., `"human"`, `"ai"`, `"hybrid"`) |
| `data` | `object` | No | Arbitrary extension metadata |

```json
{
  "id": "ls-engine-1",
  "startTime": 45.2,
  "endTime": 75.0,
  "type": "car",
  "title": "LS Engine",
  "url": "https://example.com/ls-engine",
  "speaker": "s1",
  "quote": "the LS is just a completely different animal",
  "confidence": 0.95,
  "source": "ai",
  "data": {
    "make": "Chevrolet",
    "displacement": "5.7L"
  }
}
```

### Time Format

All times are in **seconds as floating-point numbers**, measured from the start of the audio. This matches the Web Audio API, HTMLMediaElement, WebVTT, and most podcast tooling.

### The `data` Field

The `data` object is an open extension point. Producers can store any JSON-serializable metadata here. Consumers should ignore fields they don't recognize.

Common uses:
- Domain-specific attributes (make, model, year for cars)
- Rendering hints (color, icon, priority)
- Additional provenance or source metadata beyond `confidence` and `source`

## Annotation Set

An annotation set is the container format for a collection of annotations associated with a single episode or audio file.

```json
{
  "version": "1.0.0",
  "episode": {
    "title": "The Greatest Engine Swaps",
    "url": "https://example.com/episodes/engine-swaps",
    "audioUrl": "https://example.com/audio/engine-swaps.mp3"
  },
  "transcripts": [
    { "url": "https://example.com/episodes/engine-swaps.vtt", "format": "vtt" }
  ],
  "speakers": [
    { "id": "s1", "name": "Matt Farah", "role": "host" },
    { "id": "s2", "name": "Zack Peterson", "role": "host" }
  ],
  "annotations": [
    {
      "startTime": 45.2,
      "endTime": 75.0,
      "type": "car",
      "title": "LS Engine",
      "speaker": "s1",
      "quote": "the LS is just a completely different animal"
    },
    {
      "startTime": 120.0,
      "endTime": 150.5,
      "type": "part",
      "title": "Turbocharger",
      "speaker": "s2"
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
    { "id": "s1", "name": "Matt Farah", "role": "host", "url": "https://example.com/matt" },
    { "id": "s2", "name": "Zack Peterson", "role": "host" }
  ]
}
```

**Recommended roles:** `"host"`, `"guest"`, `"narrator"`, `"caller"`, `"correspondent"`. Custom roles should use lowercase. Consistent role values across implementations improve interoperability.

Speaker IDs are opaque strings. Use short, stable identifiers (e.g., `"s1"`, `"matt-farah"`). The same speaker across episodes should use the same ID to enable cross-episode analysis.

## Ad Breaks

The `adBreaks` array defines time ranges where dynamically inserted content (ads, promos, sponsorships) appears. This is separate from annotations to keep the semantic distinction clean — ad breaks are structural holes in the content, not entity references.

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

**Overlapping annotations:** When an annotation's time range overlaps with an ad break, behavior is player-defined. A player might pause the annotation during the ad and resume after, skip the annotation entirely, or extend it past the break. This spec does not mandate a specific behavior — implementations should document their approach.

## Recommended Entity Types

The following types are proven in production and recommended for interoperability. This list is not exhaustive — producers may use any string value for `type`.

| Type | Description | Example |
|------|-------------|---------|
| `car` | A specific car, truck, or vehicle | "1967 Ford Mustang" |
| `part` | A vehicle or mechanical component | "Turbocharger", "LS3 crate engine" |
| `term` | A technical or domain-specific term | "Oversteer", "Forced induction" |
| `concept` | A broader topic or idea | "Electrification", "Motorsport safety" |
| `brand` | A company or brand name | "Brembo", "Michelin" |
| `person` | A person referenced in the content | "Carroll Shelby", "Ayrton Senna" |
| `place` | A location or venue | "Nurburgring", "Bonneville Salt Flats" |

All type values use **lowercase**. Single words are preferred for common types. Multi-word custom types should be hyphenated (e.g., `"race-series"`, `"engine-code"`).

## File Extension and MIME Type

| | Recommendation |
|--|----------------|
| File extension | `.annotations.json` |
| MIME type | `application/json` |

## Examples

### Automotive Podcast

```json
{
  "version": "1.0.0",
  "episode": {
    "title": "The Greatest Engine Swaps of All Time",
    "url": "https://example.com/episodes/42",
    "audioUrl": "https://cdn.example.com/episodes/42.mp3"
  },
  "transcripts": [
    { "url": "https://cdn.example.com/episodes/42.vtt", "format": "vtt" }
  ],
  "speakers": [
    { "id": "matt", "name": "Matt Farah", "role": "host" },
    { "id": "zack", "name": "Zack Peterson", "role": "host" }
  ],
  "adBreaks": [
    { "startTime": 120.0, "endTime": 150.0, "label": "ad", "position": "mid-roll" }
  ],
  "annotations": [
    {
      "id": 1,
      "startTime": 45.2,
      "endTime": 75.0,
      "type": "car",
      "title": "1969 Chevrolet Camaro Z/28",
      "url": "https://example.com/cars/camaro-z28",
      "image": "https://cdn.example.com/images/camaro-z28.jpg",
      "speaker": "matt",
      "quote": "the Z28 was just a completely different animal",
      "data": {
        "make": "Chevrolet",
        "model": "Camaro Z/28",
        "year": 1969
      }
    },
    {
      "id": 2,
      "startTime": 160.0,
      "endTime": 190.0,
      "type": "part",
      "title": "LS3 Crate Engine",
      "speaker": "zack",
      "data": {
        "displacement": "6.2L",
        "horsepower": 430
      }
    },
    {
      "id": 3,
      "startTime": 220.0,
      "endTime": 250.0,
      "type": "person",
      "title": "Carroll Shelby",
      "speaker": "matt"
    },
    {
      "id": 4,
      "startTime": 280.5,
      "endTime": 310.0,
      "type": "term",
      "title": "Engine swap",
      "url": "https://example.com/glossary/engine-swap",
      "quote": "when we talk about an engine swap we mean..."
    }
  ]
}
```

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
  "startTime": 45.2,
  "endTime": 75.0,
  "type": "car",
  "title": "1969 Chevrolet Camaro Z/28",
  "url": "https://example.com/cars/camaro-z28"
}
```

Maps to this W3C Web Annotation:

```json
{
  "@context": "http://www.w3.org/ns/anno.jsonld",
  "type": "Annotation",
  "body": {
    "type": "TextualBody",
    "value": "1969 Chevrolet Camaro Z/28",
    "purpose": "describing",
    "format": "text/plain"
  },
  "target": {
    "source": "https://cdn.example.com/episodes/42.mp3",
    "selector": {
      "type": "FragmentSelector",
      "conformsTo": "http://www.w3.org/TR/media-frags/",
      "value": "t=45.2,75.0"
    }
  }
}
```

### Mapping Rules

| Podcast Annotation Field | W3C Web Annotation |
|-----------|--------------------|
| `startTime`, `endTime` | `target.selector.value` as `t=start,end` |
| `title` | `body.value` |
| `type` | `body.purpose` or a custom `body.type` |
| `url` | Additional `body` with `purpose: "linking"` |
| `image` | Additional `body` with `purpose: "depicting"` |
| `quote` | `body[1]` with `purpose: "quoting"` |
| `speaker` | Not mapped (no W3C equivalent) |
| `confidence` | Not mapped (application-specific) |
| `data` | Not mapped (application-specific) |
| `episode.audioUrl` | `target.source` |

> **Note:** The W3C mapping requires `episode.audioUrl` to populate `target.source`. Annotation sets without `episode.audioUrl` cannot produce complete W3C Web Annotations.

## Relationship to Other Standards

**Podcasting 2.0 Chapters** — Chapters define coarse segments (intro, topic, outro) with titles and artwork. Podcast annotations are fine-grained entity references within those segments. They are complementary: an episode might have 5 chapters and 40 annotations.

**WebVTT / SRT** — Subtitle formats carry the transcript text. This spec carries the entities and topics referenced in that text. A player might use WebVTT for the transcript and podcast annotations for contextual overlays.

**Schema.org PodcastEpisode** — Schema.org defines episode-level metadata for search engines. This spec defines within-episode annotations. A `PodcastEpisode` might link to an `.annotations.json` file via a custom property.

**Podcasting 2.0 `<podcast:person>`** — Tags people at the episode level (hosts, guests). Podcast annotations with `type: "person"` tag people at the moment level (when they're discussed, not just who's on the show).

## Reference Implementation

[podcast-annotations](https://github.com/Car-Curious/podcast-annotations-js) — Framework-agnostic JavaScript library for rendering podcast annotations with audio players. Supports annotation overlays, transcript sync, timelines, chapters, and DAI alignment.

This format was developed by [Car Curious](https://getcarcurious.com), a podcast annotation platform for automotive content, and is released as an open specification for the broader podcast ecosystem.

## License

This specification is released under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
