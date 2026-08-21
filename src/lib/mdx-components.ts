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

/**
 * Injected into every post so migrated MDX can use these tags with no import
 * lines. One module because both language post pages hand out the same set;
 * the names must stay in step with MDX_COMPONENT_NAMES (mdx-component-names.ts),
 * which the guard scripts read.
 */
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
