/**
 * The pitcher's deck, by hand.
 *
 * Three piles, one per kind of pitch, each a list of club ids from the pool.
 * The kind is how many well-known players the pool has for the club —
 * measured as players whose stint-fame there is 40 or more (see grade.ts),
 * counted at 2026-09-20 and noted beside each entry as `k`:
 *
 *   fastball    k ≥ 40   a giant. It will be hit; the question is how far.
 *   curveball   k 15–39  a club with a shelf of names, most of them doubles.
 *   knuckleball k 6–14   a small club. A strikeout, or a triple that hangs.
 *
 * Hand-picked rather than queried because the pool is global: by depth it
 * ranks Tokyo Verdy, Cerezo Osaka and JEF United above Tottenham, and a
 * British pub cannot hit any of them. This is the deck for that pub —
 * England first, then the leagues its television shows, with a few clubs
 * from further away that everyone has a name for (Boca, Inter Miami,
 * Al-Nassr). Every id was resolved against data/clubs.json by name and
 * checked for a crest; tests/slugger/deck.test.ts holds the list to the
 * pool. Nothing here was guessed.
 */
export type PitchKind = 'fastball' | 'curveball' | 'knuckleball';

export const PITCH_KINDS: readonly PitchKind[] = ['fastball', 'curveball', 'knuckleball'];

export const DECK: Readonly<Record<PitchKind, readonly string[]>> = {
  fastball: [
    'Q7156', // FC Barcelona k132
    'Q8682', // Real Madrid k118
    'Q9616', // Chelsea k115
    'Q9617', // Arsenal k114
    'Q18656', // Manchester United k112
    'Q1543', // AC Milan k111
    'Q1422', // Juventus k104
    'Q631', // Inter Milan k103
    'Q15789', // Bayern Munich k101
    'Q1130849', // Liverpool k95
    'Q483020', // PSG k87
    'Q2739', // Roma k85
    'Q50602', // Manchester City k84
    'Q18741', // Tottenham Hotspur k83
    'Q81888', // Ajax k75
    'Q41420', // Borussia Dortmund k70
    'Q8701', // Atlético Madrid k70
    'Q10329', // Sevilla k68
    'Q132885', // Marseille k67
    'Q18711', // Aston Villa k65
    'Q180305', // Monaco k63
    'Q2052', // Fiorentina k63
    'Q10333', // Valencia k61
    'Q104761', // Bayer Leverkusen k60
    'Q18747', // West Ham United k56
    'Q5794', // Everton k55
    'Q131499', // Benfica k55
    'Q6601875', // Fenerbahçe k53
    'Q18716', // Newcastle United k52
    'Q704', // Lyon k52
    'Q12297', // Villarreal k51
    'Q2641', // Napoli k50
    'Q2609', // Lazio k50
    'Q128446', // Porto k49
    'Q11938', // PSV Eindhoven k48
    'Q4512', // VfB Stuttgart k40
    'Q495299', // Galatasaray k39
    'Q75729', // Sporting CP k38
    'Q32494', // Schalke 04 k38
    'Q15799', // River Plate k39
  ],
  curveball: [
    'Q172567', // Beşiktaş k37
    'Q18732', // Southampton k35
    'Q19516', // Lille k34
    'Q19467', // Crystal Palace k33
    'Q134241', // Feyenoord k33
    'Q51974', // Hamburger SV k33
    'Q1886', // Atalanta k33
    'Q51976', // Werder Bremen k32
    'Q1457', // Sampdoria k31
    'Q172803', // Dinamo Zagreb k31
    'Q2798', // Udinese k30
    'Q10315', // Real Sociedad k30
    'Q8723', // Real Betis k29
    'Q19481', // Leicester City k29
    'Q38245', // Eintracht Frankfurt k29
    'Q18708', // Fulham k28
    'Q101859', // VfL Wolfsburg k28
    'Q8780', // Espanyol k28
    'Q29108', // Zenit k28
    'Q1128631', // Leeds United k27
    'Q101959', // Borussia Mönchengladbach k26
    'Q702455', // RB Leipzig k26
    'Q19509', // Rennes k25
    'Q2693', // Parma k25
    'Q19593', // Celtic k25
    'Q8749', // Celta Vigo k25
    'Q18744', // West Bromwich Albion k24
    'Q102720', // Hertha BSC k24
    'Q170703', // Boca Juniors k24
    'Q29115', // Lokomotiv Moscow k24
    'Q19490', // Nottingham Forest k23
    'Q18739', // Sunderland k23
    'Q2074', // Genoa k22
    'Q19628', // Olympiacos k22
    'Q19500', // Wolves k22
    'Q2768', // Torino k22
    'Q176371', // CSKA Moscow k22
    'Q4122219', // Panathinaikos k22
    'Q172476', // Bordeaux k21
    'Q19453', // Brighton k21
    'Q8687', // Athletic Club k21
    'Q18659', // Swansea City k20
    'Q19446', // Blackburn Rovers k20
    'Q1900', // Cagliari k20
    'Q2674', // Palermo k20
    'Q80955', // Santos k20
    'Q2714', // Watford k19
    'Q8760', // Deportivo de A Coruña k19
    'Q187528', // Anderlecht k19
    'Q18736', // Stoke City k19
    'Q1893', // Bologna k19
    'Q181216', // Hajduk Split k19
    'Q191264', // AZ Alkmaar k18
    'Q192641', // Trabzonspor k18
    'Q29112', // Spartak Moscow k18
    'Q19521', // Saint-Étienne k17
    'Q204357', // LA Galaxy k17
    'Q173009', // Red Star Belgrade k17
    'Q22707', // Hoffenheim k16
    'Q18661', // Middlesbrough k16
    'Q104770', // Köln k16
    'Q10308', // Real Zaragoza k16
    'Q8639', // Hellas Verona k16
    'Q189671', // Basel k16
    'Q73965', // Al Hilal k16
    'Q179075', // Dynamo Kyiv k16
    'Q185163', // Nice k15
    'Q192071', // Nantes k15
    'Q19597', // Rangers k15
    'Q190916', // Club Brugge k15
    'Q201584', // AEK Athens k15
  ],
  knuckleball: [
    'Q19451', // Bolton Wanderers k14
    'Q8806', // Getafe k14
    'Q172969', // Shakhtar Donetsk k14
    'Q994811', // Red Bull Salzburg k14
    'Q482764', // Al-Nassr k14
    'Q17497', // Dinamo Moscow k14
    'Q857938', // İstanbul Başakşehir k14
    'Q19458', // Burnley k13
    'Q19444', // Birmingham City k13
    'Q19603', // FC Twente k13
    'Q19568', // Bournemouth k13
    'Q191843', // Lens k13
    'Q8835', // Mallorca k13
    'Q8857', // Málaga k13
    'Q11945', // Girona k13
    'Q200321', // Heerenveen k13
    'Q6651', // Brescia k12
    'Q33748', // Hannover 96 k12
    'Q18750', // Wigan Athletic k12
    'Q1120838', // Como k12
    'Q6703', // Empoli k12
    'Q190561', // Standard Liège k12
    'Q193481', // Sparta Prague k12
    'Q216032', // Genk k11
    'Q19518', // Toulouse k11
    'Q105254', // Mainz 05 k11
    'Q19604', // Portsmouth k11
    'Q10286', // Osasuna k11
    'Q8603', // Sassuolo k11
    'Q131603', // 1860 Munich k11
    'Q211906', // Brøndby k11
    'Q206692', // FC Zürich k11
    'Q459090', // Club América k11
    'Q19513', // Montpellier k10
    'Q18723', // Queens Park Rangers k10
    'Q16844931', // Inter Miami k10
    'Q24711', // Groningen k10
    'Q15786', // Nürnberg k10
    'Q8812', // Granada k10
    'Q188430', // Copenhagen k10
    'Q18232', // Gent k10
    'Q188656', // Partizan k10
    'Q19477', // Hull City k9
    'Q19571', // Brentford k9
    'Q106394', // Freiburg k9
    'Q10319', // Real Valladolid k9
    'Q105853', // Karlsruher SC k9
    'Q856119', // Leganés k9
    'Q204888', // PAOK k9
    'Q204220', // New York Red Bulls k9
    'Q170040', // Rubin Kazan k9
    'Q220854', // Krasnodar k9
    'Q316789', // Melbourne Victory k9
    'Q18729', // Reading k8
    'Q8466', // Kaiserslautern k8
    'Q8823', // Levante k8
    'Q18721', // Norwich City k8
    'Q223620', // Alavés k8
    'Q12236', // Racing Santander k8
    'Q289482', // Monza k8
    'Q182876', // Auxerre k8
    'Q208399', // Bastia k8
    'Q201360', // Grasshoppers k8
    'Q44441', // Al Ahli k8
    'Q43710', // Antalyaspor k8
    'Q15214308', // Orlando City k8
    'Q19462', // Charlton Athletic k7
    'Q24680', // Utrecht k7
    'Q219233', // Vitesse k7
    'Q75684', // Braga k7
    'Q221525', // Metz k7
    'Q328658', // Le Havre k7
    'Q18380286', // Los Angeles FC k7
    'Q283545', // Al Sadd k7
    'Q18662', // Cardiff City k6
    'Q19470', // Derby County k6
    'Q9653', // Ipswich Town k6
    'Q19487', // Millwall k6
    'Q6641', // Bari k6
    'Q847587', // Salernitana k6
    'Q126334', // Strasbourg k6
    'Q48911', // Lorient k6
    'Q770740', // Eibar k6
    'Q330143', // Sydney FC k6
    'Q309480', // Al Ittihad k6
  ],
};

/** The lowest count of well-known players a club needs to be pitchable. */
export const MIN_KNOWN = 6;
