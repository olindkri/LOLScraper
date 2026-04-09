export const TRACKED_PLAYERS = [
  { id: 'oliver', gamertag: 'Hopa#Hopa' },
  { id: 'eirik', gamertag: 'ErikBby69#EUW' },
  { id: 'marcus', gamertag: 'Easy Geometry#EUW' },
  { id: 'minh', gamertag: 'KingOfTheWolvez#EUW' },
  { id: 'jon', gamertag: 'Markemouse#Monke' },
  { id: 'daniel', gamertag: 'MczExperttt#EUW' },
  { id: 'nontagan', gamertag: 'MrHipsterYip#EUW' },
  { id: 'tim', gamertag: 'Pamit#EUW' },
  { id: 'sigurd', gamertag: 'Pog0p#EUW' },
  { id: 'simon', gamertag: 'sXBLACKPHANTOMXs#2003' },
  { id: 'fredrik', gamertag: 'XxVortexSpeedxX#3845' },
  { id: 'adrian', gamertag: 'Requiem#9749' },
  { id: 'sigurdn', gamertag: 'Mr Naess#EUW' },
  { id: 'elias', gamertag: 'Hotdogmaster64#EUW' },
];

export const TRACKED_GAMERTAGS = new Set(
  TRACKED_PLAYERS.map((player) => player.gamertag),
);

export const GAMERTAGS_BY_ID = Object.fromEntries(
  TRACKED_PLAYERS.map((player) => [player.id, player.gamertag]),
);
