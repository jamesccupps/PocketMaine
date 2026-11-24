# Roadmap

What is in the game today is in the [README](README.md). This is what comes next, roughly in order, with how each piece would be built and what it costs.

## Just added

- **VIPs and special freight** (level 2): gold jobs that pay three to four times the fare and bring a reward.
- **Ship calls and statewide events** (level 3): a cruise ship or a freighter in port for two days, bean suppers and weddings at any port, fuel price wars, parts swap meets, fish runs.
- **Holiday themes** that follow the real calendar: New Year, Valentine's Day, Independence Day, Halloween, Thanksgiving, Christmas.

## Next

### 1. Ships you own

Today a cruise ship or freighter only visits. The next step is owning them.

- **What:** three late-game hulls, bought at a boatyard from about level 9: a car ferry, a coastal freighter, an excursion boat. Twenty to sixty slots each.
- **New rules:** deep-water harbors only (Portland, Rockland, Boothbay Harbor, Bar Harbor, Eastport), slow, with a large fuel bill.
- **Keeping them from being a chore:** freight comes in lots, one job that fills ten slots, so a sixty-slot ship is six taps. An excursion boat sells a loop of three or four ports and is paid by the stop, with no loading at all.
- **Cost:** a new job type, a harbor depth flag, three sprites and their port scenes, and a balance pass. Medium to large.
- **Risk:** late-game money piles up faster. It needs something to spend on, most likely a second tier of port works.

### 2. Beyond Maine: New England

The direction is New England. Canada stays as gateways only.

- **Step A. Gateways.** Ports just off the edge of the map, shown as arrows on the border: Portsmouth and Boston to the south, Burlington to the west, and Saint John, Yarmouth and Quebec City for Canada. Each is a long haul with a large fare, opened by level and a fee. This reuses ports, routes, fares and events as they are; the only new thing is a port that is not on the drawn map. It is the quick way to make the world feel bigger while the map is being drawn.
- **Step B. New Hampshire and Vermont.** The map grows west: Portsmouth, Lake Winnipesaukee, North Conway and Mount Washington, Berlin, Burlington and Lake Champlain, Stowe, Montpelier. Mostly mountains and lakes, so it suits floatplanes and ski season, and it has little coastline to draw.
- **Step C. Massachusetts, Rhode Island and Connecticut.** The map grows south: Boston, Gloucester, Provincetown and the Cape, Nantucket, Martha's Vineyard, New Bedford, Providence, Newport, Block Island, New London, Hartford. This is where ferries and the owned ships earn their keep. It is also the most work, because the coast from Cape Ann around Cape Cod to Long Island Sound is drawn by hand.
- **One map, not several.** The plan is one continuous map that scrolls, so a boat can follow the coast from Eastport to Block Island. The other way, a separate map per state with a button to switch, is less work per step but breaks coastal trips into hops.
- **What it costs.** The drawn area roughly doubles, so the map takes more memory and longer to build at startup, and a zoomed-out phone screen holds twice as many ports. Names already show only for ports you serve, which keeps that readable. Each step also needs its own ports, fares, events and fishing grounds balanced against Maine's.
- **The name stays.** Maine is the home base and where every new game starts.

### 3. More holidays

- More dates: St. Patrick's Day, Maine Maple Sunday, Patriots' Day, Memorial Day, Labor Day.
- Decorations on the map itself. Today the port scenes are dressed and the map only gets leaves, snow or fireworks.
- A holiday paint scheme for craft, kept after the holiday if it was earned.

### 4. Deeper VIPs

- Recurring VIPs with a chain: carry the lighthouse inspector to five lights and get something no shop sells.
- Preferences: no stops, a craft in good repair, daylight only. Meet them for the full reward.
- One or two craft that can only be built from VIP parts crates.

### 5. Deeper events

- A calendar in the Almanac showing what is coming this season.
- Weather events: relief runs after a nor'easter.
- Events that move, such as a lobster boat race circuit from harbor to harbor.

## Smaller things

- A test pass on real phones. Everything so far is tested in headless Chrome at phone sizes.
- Balance over long sessions.
- A tagged release on GitHub.
- Save to a file as well as a save code.

## Not planned

Energy timers, premium currency, ads, purchases, accounts or a server.
