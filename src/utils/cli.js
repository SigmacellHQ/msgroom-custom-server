/*
Windows 96 Userland Source Code.
Copyright (C) 2023 Windows96.net

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

/** The option marker. */
const OPTION_MARKER = "--";

/**
 * Collects options from an argument list.
 * @param {string[]} args The arguments to collect options from.
 * @param { valueOptions: [] } props Collection properties
 */
function collectOptions(args, props) {
    /** Collected options */
    const options = [];

    /** Remainder from command line */
    const remainder = [];

    /**
     * Collector options
     */
    const config = {
        ...{
            /** Options which require a value next to it */
            valueOptions: []
        },
        ...props
    }

    for(let x = 0; x < args.length; x++) {
        const arg = args[x];

        if(arg.startsWith(OPTION_MARKER)) {
            // Option found
            const name = arg.substring(OPTION_MARKER.length);
            
            // Check if this option needs a value
            if(config.valueOptions.includes(name)) {
                const nextArg = args[x + 1];

                if((nextArg == null) || (nextArg.startsWith(OPTION_MARKER)))
                    throw new Error(`'${OPTION_MARKER}${name}' requires an argument.`);

                options.push({
                    name,
                    value: nextArg
                });

                x++;
            } else {
                // Just push the item
                options.push({
                    name,
                    value: null
                });
            }
        }
        else
            remainder.push(arg);
    }

    return {
        options,
        remainder
    }
}

/**
 * CLI utilities.
 */
export {
    collectOptions
}