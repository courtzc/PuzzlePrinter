# PuzzlePrinter
Creates printable pdf collections of puzzles from the websites `https://www.puzzle-{puzzle}.com`.

## How to run
In the command prompt, in the src folder, run
`node puzzleSaver.js configs/<puzzle config json file>`
e.g. `node puzzleSaver.js configs/puzzleSaverConfig.json`

The pdfs will save to your puzzles/ folder

## How to automate
If on windows, you can set up tasks in the task scheduler which will run and save the special puzzles (daily, weekly, monthly). Import `src/PuzzlesDailyScheduler.xml` etc into your Daily Scheduler, adjusting the path to `node`, and your `PuzzlePrinter` repository.

## How to customise

### Create a Config file
The config file defines which puzzles to print out, and how many.

Example config file:
```
{
    "metadata": {
        "type": "normal" // can be "normal" or "special"
    },
    "puzzles": [
        {
            "puzzleName": "Thermometers, 15x15, Curved",
            "url": "https://www.puzzle-thermometers.com/?size=7",
            "numPuzzles": 50,
            "aspectRatio": {
                "height": 1,
                "width": 1
            }
        },
        {
            "puzzleName": "Thermometers, 15x15, Straight",
            "url": "https://www.puzzle-thermometers.com/?size=6",
            "numPuzzles": 25,
            "aspectRatio": {
                "height": 1,
                "width": 1
            }
        }
    ]
}
```

### Find the puzzle aspect ratio
Some puzzles aren't square. Define the aspect ratio of your puzzle in the config to ensure proper printing. Ratios are normalised to 1 for height.

Known ratios:
```
{
    "Aquarium": {"aspectRatio": {"height": 1, "width": 1}},
    "Stitches": {"aspectRatio": {"height": 1, "width": 1}},
    "Thermometers": {"aspectRatio": {"height": 1, "width": 1}},
    "Battleships": {"aspectRatio": {"height": 1, "width": 0.78417}},
    "Renzoku": {"aspectRatio": {"height": 1, "width": 1.14516}}
}
```

To find a ratio for a new puzzle, go to the puzzle online, open dev tools (`ctrl+shift+i`) and then key in `ctrl+shift+c`. Hover over the div '#puzzleContainerDiv' to see the width and height. Normalise to 1 height by x width.


## To do
Add printing from node? https://www.npmjs.com/package/pdf-to-printer
