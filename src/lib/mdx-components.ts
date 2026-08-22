import { Vimeo, YouTube } from 'astro-embed'
import Bookmark from '../components/Bookmark.astro'
import HtmlLab from '../components/HtmlLab.astro'
import LabDemo from '../components/LabDemo.astro'
import MarginNote from '../components/MarginNote.astro'
import MissingImage from '../components/MissingImage.astro'
import RawEmbed from '../components/RawEmbed.astro'
import Sidenote from '../components/Sidenote.astro'
import SpeakerDeck from '../components/SpeakerDeck.astro'
import Spotify from '../components/Spotify.astro'
import Tweet from '../components/Tweet.astro'
import Video from '../components/Video.astro'

/** Must stay in sync with MDX_COMPONENT_NAMES in mdx-component-names.ts. */
export const mdxComponents = {
  Bookmark,
  HtmlLab,
  LabDemo,
  MarginNote,
  MissingImage,
  RawEmbed,
  Sidenote,
  SpeakerDeck,
  Spotify,
  Tweet,
  Video,
  Vimeo,
  YouTube,
}
