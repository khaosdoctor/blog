import { Vimeo, YouTube } from 'astro-embed'
import Bookmark from '../components/Bookmark.astro'
import HtmlLab from '../components/HtmlLab.astro'
import LabDemo from '../components/LabDemo.astro'
import MissingImage from '../components/MissingImage.astro'
import RawEmbed from '../components/RawEmbed.astro'
import SpeakerDeck from '../components/SpeakerDeck.astro'
import Spotify from '../components/Spotify.astro'
import Tweet from '../components/Tweet.astro'
import Video from '../components/Video.astro'

/** Must stay in sync with MDX_COMPONENT_NAMES in mdx-component-names.ts. */
export const mdxComponents = {
  Bookmark,
  HtmlLab,
  LabDemo,
  MissingImage,
  RawEmbed,
  SpeakerDeck,
  Spotify,
  Tweet,
  Video,
  Vimeo,
  YouTube,
}
