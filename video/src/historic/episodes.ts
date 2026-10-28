/**
 * Scripts for the Historic Earthquakes Shorts 01 to 03. Same structure as the educational episodes (see ../edu/episodes.ts):
 * one ElevenLabs clip per line, taken from the shared narration library when an identical approved clip exists.
 * Numbers are written as words so the voice reads them naturally.
 * Verified against: USGS ComCat (magnitudes, times, epicentres), USGS 1906 event pages, USGS HVO (1960 Hawaii/Japan travel times), USGS (2011 casualties, runup), JMA (2013 warning revision). See README, Historic Earthquakes.
 */
import { CTA_LINE, plan } from '../edu/episodes.js';
import type { EpisodeMeta } from '../edu/episodes.js';

export type HistoricId = 'chile1960' | 'japan2011' | 'sanfrancisco1906' | 'northridge1994';

export const HISTORIC: Record<HistoricId, EpisodeMeta> = {
  chile1960: {
    id: 'chile1960', number: 1, compositionId: 'HistoricChile1960', title: 'The Strongest Earthquake Ever Recorded: Chile, 1960', baseSeconds: 58,
    script: plan( [
      { id: 'hook', text: 'The strongest earthquake ever recorded struck Chile.' },
      { id: 'date', text: 'May twenty-second, nineteen sixty. Magnitude nine point five.' },
      { id: 'plates', text: 'Here, the Nazca plate slides beneath South America.' },
      { id: 'lock', text: 'The plates had locked together, building stress.' },
      { id: 'rupture', text: 'Then the fault ruptured along hundreds of kilometers of the Chilean coast.' },
      { id: 'sea', text: 'The seafloor heaved upward, and the ocean surged outward.' },
      { id: 'tsunami', text: 'Within hours, tsunami waves were racing across the Pacific.' },
      { id: 'hawaii', text: 'About fifteen hours later they reached Hawaii, and in Hilo, sixty-one people died.' },
      { id: 'japan', text: 'About twenty-two hours after the quake, waves reached Japan.' },
      { id: 'record', text: 'It is still the largest earthquake ever recorded by instruments.' },
      { id: 'ocean', text: 'A reminder that a tsunami can cross an entire ocean.' },
      CTA_LINE
    ] )
  },
  japan2011: {
    id: 'japan2011', number: 2, compositionId: 'HistoricJapan2011', title: 'The 2011 Japan Earthquake and Tsunami', baseSeconds: 58,
    script: plan( [
      { id: 'hook', text: 'Magnitude nine point one. Then, a tsunami.' },
      { id: 'date', text: 'March eleventh, twenty eleven, off the northeast coast of Japan.' },
      { id: 'plates', text: 'Here, the Pacific plate dives beneath northern Japan.' },
      { id: 'lock', text: 'The plates had been locked, storing strain.' },
      { id: 'slip', text: 'Then the fault slipped, by tens of meters, beneath the seafloor.' },
      { id: 'wave', text: 'The seafloor was thrust upward, and a tsunami struck the coast.' },
      { id: 'runup', text: 'In places, the water surged more than thirty meters up the land.' },
      { id: 'lives', text: 'More than fifteen thousand people lost their lives.' },
      { id: 'fukushima', text: 'The tsunami also crippled the Fukushima Daiichi nuclear plant, forcing evacuations.' },
      { id: 'warning', text: 'Japan later reworked its warnings, after early alerts underestimated the tsunami.' },
      { id: 'lesson', text: 'The lesson: near the coast, strong shaking is itself the warning.' },
      CTA_LINE
    ] )
  },
  sanfrancisco1906: {
    id: 'sanfrancisco1906', number: 3, compositionId: 'HistoricSanFrancisco1906', title: 'The 1906 San Francisco Earthquake', baseSeconds: 58,
    script: plan( [
      { id: 'hook', text: 'April eighteenth, nineteen oh six: the earthquake that devastated San Francisco.' },
      { id: 'time', text: 'Just after five in the morning, the ground began to shake.' },
      { id: 'mag', text: 'It was a magnitude seven point nine.' },
      { id: 'fault', text: 'It struck on the San Andreas Fault.' },
      { id: 'strike', text: 'There, the Pacific and North American plates slide past each other, sideways.' },
      { id: 'length', text: 'The fault broke along nearly three hundred miles of Northern California.' },
      { id: 'offset', text: 'Near Point Reyes, the ground was offset by about twenty feet.' },
      { id: 'fire', text: 'Broken water mains left firefighters struggling as fires burned for days.' },
      { id: 'toll', text: 'Early official reports underestimated the death toll, now believed to number in the thousands.' },
      { id: 'reid', text: 'Scientists mapped the broken ground, and Harry Reid explained what they saw.' },
      { id: 'rebound', text: 'Rock bends, stores energy, then snaps back. We still call it elastic rebound.' },
      CTA_LINE
    ] )
  },
  northridge1994: {
    id: 'northridge1994', number: 4, compositionId: 'HistoricNorthridge1994', title: 'Northridge 1994: The M6.7 Earthquake That Shattered Los Angeles', baseSeconds: 58,
    script: plan( [
      { id: 'hook', text: 'Freeway overpasses collapsed, and the earthquake was right beneath Los Angeles.' },
      { id: 'date', text: 'January seventeenth, nineteen ninety-four, just before four thirty-one in the morning.' },
      { id: 'mag', text: 'Magnitude six point seven.', gap: 0.45 },
      { id: 'notsa', text: 'It was not the San Andreas Fault.', gap: 0.5 },
      { id: 'blind', text: 'It was a blind thrust fault, hidden about eighteen kilometers beneath the San Fernando Valley.' },
      { id: 'rupture', text: 'Rock slid up and over along the fault, and the Santa Susana Mountains rose by as much as seventy centimeters.' },
      { id: 'shake', text: 'For ten to twenty seconds, the shaking was violent.' },
      { id: 'damage', text: 'Apartment buildings, parking structures and freeway bridges gave way.' },
      { id: 'toll', text: 'Dozens of people died, thousands were hurt, and the damage reached tens of billions of dollars.' },
      { id: 'old', text: 'Many of the collapsed structures were older designs, built before modern seismic rules.' },
      { id: 'change', text: 'California began a major bridge retrofit program, and building codes were updated.' },
      { id: 'lesson', text: 'The lesson: a dangerous fault can hide beneath a city, so strengthen buildings before the shaking.' },
      CTA_LINE
    ] )
  }
};

export const HISTORIC_LIST = Object.values( HISTORIC );
