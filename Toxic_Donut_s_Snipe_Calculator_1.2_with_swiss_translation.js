(async () => {
    if (typeof window.twLib === 'undefined') {
        $.getScript('https://media.innogames.com/com_DS_NL/scripts/resources/TribalWarsLibrary.js', myScript);
    } else {
        await myScript();
    }

    async function myScript() {
        // Needed parameters
        const version = '1.9';
        const searchParams = (type) => new URLSearchParams(window.location.search)?.get(type)?.toLowerCase();
        const getServerDateTime = () => {
            const [hour, min, sec, day, month, year] = $('#serverTime').closest('p').text().match(/\d+/g);
            return new Date(year, (month - 1), day, hour, min, sec).getTime();
        }
        const local = game_data.locale, screen = game_data.screen, mode = game_data.mode ?? searchParams('mode'),
            world = game_data.world, baseLink = game_data.link_base_pure, playerId = parseInt(game_data.player.id),
            sitterId = parseInt(game_data.player.sitter), win = window;
        const snipeImage = 'https://dl.dropboxusercontent.com/s/j2pmzewy5e7zyri/download%20%283%29.png?dl=0';
        const mobileCheck = $('#mobileHeader').length > 0;
        const dateRegex = /(\d+.\d+.\d+)\s+(\d+:\d+:\d+(:\d+|))|\w+\s+\d+,\s+\d+\s+\d+:\d+:\d+(:\d+|)/g;
        const settingsKey = `toxicDonutSnipeCalcSettings_${version}_${world}`;
        const unitSpeedsKey = `unitSpeedSettings_${world}`;
        const donutSmall = 'https://toxicdonut.dev:8080/img/logo.png';
        const unitSpeedSettings = JSON.parse(localStorage.getItem(unitSpeedsKey)) ?? getUnitConfig();
        const villageListKey = `ToxicDonuts_villagesList_${world}`;
        const lastUploadDate = parseInt(localStorage.getItem(`${villageListKey}_lastUploadVillageData`));

        const serverOffset = Math.round(Math.abs(new Date(getServerDateTime()) - new Date()) / 36e5) * 3600 * 1000;


        
const trans = {
    ch_CH: {
        arrival: 'Akunft',
        upcoming: 'Iträffänd',
        incEnh_upcoming: 'Akunft',
        village: 'Dorf',
        osBoost: 'Support Boost',
        fightTime: 'Kampfzit',
        attack: 'Agriff',
    }
};

const trans = {
            nl_NL: {
                arrival: 'Aankomst',
                upcoming: 'Aankomend',
                incEnh_upcoming: 'Arriving',
                village: 'Dorp:',
                osBoost: 'OS Boost',
                fightTime: 'Gevechtstijd',
            }, en_DK: {
                arrival: 'Arrival',
                upcoming: 'Incomings',
                incEnh_upcoming: 'Arriving',
                village: 'Village:',
                osBoost: 'Support Boost',
                fightTime: 'Fight time'
            }, de_DE: {
                arrival: 'Ankunft',
                upcoming: 'Eingehende',
                incEnh_upcoming: 'Ankunft',
                village: 'Dorf:',
                osBoost: 'Support Boost',
                fightTime: 'Kampfzeit'
            }
        };

        let settings = JSON.parse(localStorage.getItem(settingsKey)) ?? getDefaultSettings();
        let updated = false;
        const reservedWords = settings.reservedWordUnits;

        const getVillageId = (coord, storedVillageList) => new Promise((resolve, reject) => {
            if (coord in storedVillageList) {
                resolve(storedVillageList[coord].id);
            } else if (updated || lastUploadDate + 60 * 60 * 1000 > Timing.getCurrentServerTime()) {
                updated = true;
                resolve(undefined);
            } else {
                loadVillageData('update').then(result => {
                    storedVillageList = result;
                    resolve([true, result[coord]?.id]);
                });
            }
        });

        // Needed functions
        if (!Array.prototype.findE) {
            Array.prototype.findE = function (index) {
                return this[index];
            };
        }

        $.expr[':'].contains = function (a, i, m) {
            return jQuery(a).text().toUpperCase()
                .indexOf(m[3].toUpperCase()) >= 0;
        };

        // Script activators
        if (game_data.features.Premium.active) {
            let questLog = $('#questlog, #questlog_new');
            if (questLog.length < 1) {
                $('.maincell').prepend(`<div style="position:fixed;"><div id="questlog" class="questlog"></div></div>`);
                questLog = $('#questlog');
            }
            $(questLog).append(`
                                <div class="quest opened startSnipeFinder" style="background-image: url('${snipeImage}');">
                                    <div class="quest_progress" style="width: 0;"></div>
                                </div>`);
        }

        switch (screen) {
            case 'report' : {
                const table = $('#attack_info_att');
                if (mode !== null && searchParams('view') && table.length > 0) {
                    const sourceVillagePlayerId = $('tr:eq(0) th a', '').attr('href')?.split('id=').pop() ?? 0;
                    if (parseInt(sourceVillagePlayerId) !== playerId) {
                        const arrivalTime = convertFromDate($(`td:contains(${trans[local]['fightTime']}):last`).next('td').text().trim());
                        const sourceCoord = extractCoords($('tr:eq(1) td:last', table).text().trim());
                        const targetCoord = extractCoords($('#attack_info_def tr:eq(1) td:last').text().trim());
                        const sortedUnits = Object.keys(Object.entries(unitSpeedSettings)
                            .sort(([, a], [, b]) => b - a)
                            .reduce((r, [k, v]) => ({...r, [k]: parseFloat(v)}), {}));

                        for (const unit of sortedUnits) {
                            if ($(`#attack_info_att_units .unit-item-${unit}:first`).text() > 0) {
                                const backtime = new Date(Math.round(new Date(arrivalTime).getTime() + calculateTravelTime(targetCoord, sourceCoord, unit))).setMilliseconds(0);
                                $(`td:contains(${trans[local]['fightTime']}):last`).next('td')
                                    .append(`<span style="float: right"><input id="openBacktime" type="button" class="btn" data-coords="${sourceCoord}" data-arrival="${backtime}" value="Backtime "></span>`);
                                break;
                            }
                        }
                        $('#openBacktime').on('click', function () {
                            const coords = $(this).data('coords');
                            const backtime = new Date($(this).data('arrival'));

                            //if (backtime?.getTime() <= Timing.getCurrentServerTime()) return UI.ErrorMessage(`The attacking troops have already returned home.`);

                            startSnipeInterface(coords, formatTimes(backtime), true);
                        });
                    }
                }
                break;
            }
            case 'place': {
                if ($('#troop_confirm_submit').length === 0) {
                    const slowestUnit = searchParams('unit');
                    const template = searchParams('donutTemplate');
                    const fillUnits = searchParams('fillUnitsCheckbox') === 'true';
                    if (slowestUnit) $(`[name="${slowestUnit}"]:first`).closest('td').css('border', '2px solid black');
                    if (template !== '0' && !fillUnits) TroopTemplates.useTemplate(template);
                    if (fillUnits) {
                        const unitSpeed = unitSpeedSettings[slowestUnit];

                        const filteredUnits = Object.keys(unitSpeedSettings)
                            .filter(unit => unit !== 'spy')
                            .filter(unit => {
                                return ['ram', 'catapult'].includes(slowestUnit) ? unitSpeedSettings[unit] === unitSpeed : unitSpeedSettings[unit] <= unitSpeed
                            });
                        filteredUnits.forEach(unit => {
                            const availableUnits = Number($(`#unit_input_${unit}`).data('all-count'));
                            const inputValue = ['ram', 'catapult'].includes(unit) && availableUnits > 1 ? 1 : $(`#unit_input_${unit}`).data('all-count');
                            $(`#unit_input_${unit}`).val(inputValue);
                        });
                    }
                }
                break;
            }
            case 'overview': {
                createOverviewInterface();

                break;
            }
            case 'info_village': {
                createInfoVillageInterface();

                break;
            }
            case 'overview_villages':
            case 'donut': {
                if (screen === 'donut' || (mode === 'incomings' && ['attacks', 'shared', 'all'].includes(searchParams('subtype')))) createOverviewVillagesInterface();
                if (('commands' === mode || !mode) && searchParams('type') === 'attack') createCommandsInterface();

                break;
            }
            case 'memo': {
                createMailMemoForumInterface('img[src*="/graphic/command/attack"]', '.show_row');

                break;
            }
            case 'forum': {
                createMailMemoForumInterface('img[src*="attack"]', '.text, .forum_post');

                break;
            }
            case 'mail': {
                if (mode === 'view') createMailMemoForumInterface('img[src*="attack"]', '.text, .forum_post');

                break;
            }
        }

        // Main function
        checkboxActivation();

        async function startSnipeInterface(backtimeCoord, backtime, isBacktime) {
            try {
                const templates = await twLib.get(`${baseLink}place`).then((html) => $('.troop_template_selector', html).map((i, el) => {
                    return [[Number($(el).attr('onclick').match(/\d+/)), $(el).text()]]
                }).get());
                const checkedCheckboxes = $('.snipeSelectedSnipes:checked:visible').get();
                const targetArray = [];
                const defaultCoords = game_data.village.coord;
                const defaultDateAndTime = formatTimes(new Date(getServerDateTime()));
                const notes = await loadNotes();
                let groupUrl = `${baseLink}groups&mode=overview&ajax=load_group_menu`;
                if (sitterId) groupUrl += `&t=${playerId}`;
                const groups = await twLib.get(`${game_data.link_base_pure}groups&mode=overview&ajax=load_group_menu`);
                const osBoost = settings?.os_boost?.toFixed(2) ?? 1.00;
                const attackType = settings?.selectedType;

                if (checkedCheckboxes.length) {
                    for (const row of checkedCheckboxes) {
                        const snipeDateAndTime = $(row).data('arrival');
                        const commandId = $(row).data('command-id');
                        const coords = $(row).data('coords') ?? await getCoordsFromCommandId(commandId);
                        const sourceCoord = $(row).data('source');
                        const unit = $(row).data('unit');
                        targetArray.push(`${createTargetRow(coords, snipeDateAndTime, attackType, sourceCoord, commandId, unit)}`);
                    }
                } else if (backtime && backtimeCoord && isBacktime) {
                    targetArray.push(`${createTargetRow(backtimeCoord, backtime, '', '', '', '', isBacktime)}`);
                } else {
                    targetArray.push(`${createTargetRow(defaultCoords, defaultDateAndTime, attackType, defaultCoords)}`);
                }

                Dialog.show('snipePopupTable', createPopupHtml(osBoost, groups, targetArray, attackType, templates, notes), null, mobileCheck ? "" : {close_from_fader: false});
                $('#popup_box_snipePopupTable').css('width', mobileCheck ? window.innerWidth - 35 : window.innerWidth / 3);
                $(`input[value="${settings.selectedOutput}"]`).prop('checked', true);

                targetHandlers();
                clickHandlers(isBacktime);
                setValue();
            } catch (e) {
                UI.ErrorMessage('Er is een error', e);
            }
        }

        function loadNotes() {
            return twLib.get(baseLink + 'memo').then(html => {
                return $('.memo_container', html).map((i, el) => {
                    const id = parseInt($(el).attr('id').match(/\d+/));
                    const nameDiv = $(el).prevAll('#tab-menu, #tab-bar');
                    const name = $(`ul li:eq(${i}), #tab_${id} a:first`, nameDiv).text().trim();
                    const data = $(`#message_${id}`, html).text().trim();

                    return {
                        id: id, name: name, data: data
                    };
                }).get();
            });
        }

        function clickHandlers(isBacktime) {
            const notesRow = $('.noteRow');

            $('#calculateSnipesButton').on('click', async () => (await snipeCalcInit(notesRow, isBacktime)));
            $('#resetStorage').on('click', () => resetLocalStorage());
            $('input[name="outputFormat"]').on('change', (el) => handleOutputChange(el?.target, notesRow));
            $('#pushToNotes').on('click', () => handleNotesPush());
        }

        const LZString = function () {
            var r = String.fromCharCode;

            var i = {
                compressToUTF16: function (o) {
                    return null == o ? '' : i._compress(o, 15, function (o) {
                        return r(o + 32);
                    }) + ' ';
                }, decompressFromUTF16: function (r) {
                    return null == r ? '' : '' == r ? null : i._decompress(r.length, 16384, function (o) {
                        return r.charCodeAt(o) - 32;
                    });
                }, compress: function (o) {
                    return i._compress(o, 16, function (o) {
                        return r(o);
                    });
                }, _compress: function (r, o, n) {
                    if (null == r) return '';
                    var e, t, i, s = {}, u = {}, a = '', p = '', c = '', l = 2, f = 3, h = 2, d = [], m = 0, v = 0;
                    for (i = 0; i < r.length; i += 1) if (a = r.charAt(i), Object.prototype.hasOwnProperty.call(s, a) || (s[a] = f++, u[a] = !0), p = c + a, Object.prototype.hasOwnProperty.call(s, p)) c = p; else {
                        if (Object.prototype.hasOwnProperty.call(u, c)) {
                            if (c.charCodeAt(0) < 256) {
                                for (e = 0; e < h; e++) m <<= 1, v == o - 1 ? (v = 0, d.push(n(m)), m = 0) : v++;
                                for (t = c.charCodeAt(0), e = 0; e < 8; e++) m = m << 1 | 1 & t, v == o - 1 ? (v = 0, d.push(n(m)), m = 0) : v++, t >>= 1;
                            } else {
                                for (t = 1, e = 0; e < h; e++) m = m << 1 | t, v == o - 1 ? (v = 0, d.push(n(m)), m = 0) : v++, t = 0;
                                for (t = c.charCodeAt(0), e = 0; e < 16; e++) m = m << 1 | 1 & t, v == o - 1 ? (v = 0, d.push(n(m)), m = 0) : v++, t >>= 1;
                            }
                            0 == --l && (l = Math.pow(2, h), h++), delete u[c];
                        } else for (t = s[c], e = 0; e < h; e++) m = m << 1 | 1 & t, v == o - 1 ? (v = 0, d.push(n(m)), m = 0) : v++, t >>= 1;
                        0 == --l && (l = Math.pow(2, h), h++), s[p] = f++, c = String(a);
                    }
                    if ('' !== c) {
                        if (Object.prototype.hasOwnProperty.call(u, c)) {
                            if (c.charCodeAt(0) < 256) {
                                for (e = 0; e < h; e++) m <<= 1, v == o - 1 ? (v = 0, d.push(n(m)), m = 0) : v++;
                                for (t = c.charCodeAt(0), e = 0; e < 8; e++) m = m << 1 | 1 & t, v == o - 1 ? (v = 0, d.push(n(m)), m = 0) : v++, t >>= 1;
                            } else {
                                for (t = 1, e = 0; e < h; e++) m = m << 1 | t, v == o - 1 ? (v = 0, d.push(n(m)), m = 0) : v++, t = 0;
                                for (t = c.charCodeAt(0), e = 0; e < 16; e++) m = m << 1 | 1 & t, v == o - 1 ? (v = 0, d.push(n(m)), m = 0) : v++, t >>= 1;
                            }
                            0 == --l && (l = Math.pow(2, h), h++), delete u[c];
                        } else for (t = s[c], e = 0; e < h; e++) m = m << 1 | 1 & t, v == o - 1 ? (v = 0, d.push(n(m)), m = 0) : v++, t >>= 1;
                        0 == --l && (l = Math.pow(2, h), h++);
                    }
                    for (t = 2, e = 0; e < h; e++) m = m << 1 | 1 & t, v == o - 1 ? (v = 0, d.push(n(m)), m = 0) : v++, t >>= 1;
                    for (; ;) {
                        if (m <<= 1, v == o - 1) {
                            d.push(n(m));
                            break;
                        }
                        v++;
                    }
                    return d.join('');
                }, _decompress: function (o, n, e) {
                    var t, i, s, u, a, p, c, l = [], f = 4, h = 4, d = 3, m = '', v = [],
                        g = {val: e(0), position: n, index: 1};
                    for (t = 0; t < 3; t += 1) l[t] = t;
                    for (s = 0, a = Math.pow(2, 2), p = 1; p != a;) u = g.val & g.position, g.position >>= 1, 0 == g.position && (g.position = n, g.val = e(g.index++)), s |= (u > 0 ? 1 : 0) * p, p <<= 1;
                    switch (s) {
                        case 0:
                            for (s = 0, a = Math.pow(2, 8), p = 1; p != a;) u = g.val & g.position, g.position >>= 1, 0 == g.position && (g.position = n, g.val = e(g.index++)), s |= (u > 0 ? 1 : 0) * p, p <<= 1;
                            c = r(s);
                            break;
                        case 1:
                            for (s = 0, a = Math.pow(2, 16), p = 1; p != a;) u = g.val & g.position, g.position >>= 1, 0 == g.position && (g.position = n, g.val = e(g.index++)), s |= (u > 0 ? 1 : 0) * p, p <<= 1;
                            c = r(s);
                            break;
                        case 2:
                            return '';
                    }
                    for (l[3] = c, i = c, v.push(c); ;) {
                        if (g.index > o) return '';
                        for (s = 0, a = Math.pow(2, d), p = 1; p != a;) u = g.val & g.position, g.position >>= 1, 0 == g.position && (g.position = n, g.val = e(g.index++)), s |= (u > 0 ? 1 : 0) * p, p <<= 1;
                        switch (c = s) {
                            case 0:
                                for (s = 0, a = Math.pow(2, 8), p = 1; p != a;) u = g.val & g.position, g.position >>= 1, 0 == g.position && (g.position = n, g.val = e(g.index++)), s |= (u > 0 ? 1 : 0) * p, p <<= 1;
                                l[h++] = r(s), c = h - 1, f--;
                                break;
                            case 1:
                                for (s = 0, a = Math.pow(2, 16), p = 1; p != a;) u = g.val & g.position, g.position >>= 1, 0 == g.position && (g.position = n, g.val = e(g.index++)), s |= (u > 0 ? 1 : 0) * p, p <<= 1;
                                l[h++] = r(s), c = h - 1, f--;
                                break;
                            case 2:
                                return v.join('');
                        }
                        if (0 == f && (f = Math.pow(2, d), d++), l[c]) m = l[c]; else {
                            if (c !== h) return null;
                            m = i + i.charAt(0);
                        }
                        v.push(m), l[h++] = i + m.charAt(0), i = m, 0 == --f && (f = Math.pow(2, d), d++);
                    }
                }
            };
            return i;
        }();

        // Village data from world database //
        async function loadVillageData(type) {
            const lastUploadDate = parseInt(localStorage.getItem(`${villageListKey}_lastUploadVillageData`));

            if (villageListKey in localStorage && type !== 'update') {
                const localstorageString = localStorage.getItem(villageListKey);
                return JSON.parse(LZString.decompressFromUTF16(localstorageString));
            } else if (lastUploadDate + 60 * 60 * 1000 > Timing.getCurrentServerTime()) {
                return UI.ErrorMessage('You can only load village data once every hour.');
            } else {
                let villageOverviewList = {};
                await twLib.ajax({
                    url: location.origin + '/map/village.txt', async: true, success: function (villages) {
                        villages.match(/[^\r\n]+/g).forEach(villageData => {
                            const splitVillageData = villageData.split(',');
                            const coordinates = splitVillageData[2] + "|" + splitVillageData[3];
                            villageOverviewList[coordinates] = {
                                id: splitVillageData[0], player_id: splitVillageData[4]
                            };
                        });
                        localStorage.setItem(villageListKey, LZString.compressToUTF16(JSON.stringify(villageOverviewList)));
                        localStorage.setItem(`${villageListKey}_lastUploadVillageData`, Timing.getCurrentServerTime());
                        UI.SuccessMessage(`Successfully stored ${Object.keys(villageOverviewList).length} villages for TW world: ${world} to localstorage`);
                    }
                });
                return villageOverviewList;
            }
        }

        async function snipeCalcInit(notesRow) {
            let storedVillageList = await loadVillageData();
            const targetRow = $('.targetRow');
            const attackType = $('#typeOfCommand').val();
            if ($(targetRow).get().filter(el => $('.targetCoord:visible', el).val() === $('.sourceCoord:visible', el).val()).length) {
                return UI.ErrorMessage('Target and source coord can not be the same while using backtime mode.');
            } else if (attackType === 'Backtime' && !$(targetRow)?.get().filter(el => $(el).data('command-id') || $('.sourceCoord:visible', el)?.val()?.match(/\d{1,3}\|\d{1,3}/)).length) {
                return UI.ErrorMessage('Source coord is not retrievable, please fill it in.');
            } else if ($(targetRow).length) {
                $('#popup_box_snipePopupTable').css('width', mobileCheck ? window.innerWidth - 35 : 1000);
                $('.snipeRow').remove();
                const notesArea = [], offPackArea = [], timerArea = [];
                const requestedAmount = $('#snipeOutputAmount').val();
                const template = $('#donutSnipeCalcTemplate').val();
                const fillUnits = $('#fillUnitsCheckbox').prop('checked');
                const endTimeWarning = $('#endTimeWarning').is(':checked');
                const osBoost = $('#osBoost').val();
                const requestedUnits = extractInputValues();
                const [villages, unitsToLoopOver] = await loadOverview('combined', settings.groupId, attackType);
                const unitsToLoopOverKeys = unitsToLoopOver.map(el => el.unit);
                const availableUnits = [];

                let calcErrors = ``, totalSnipesFound = 0;

                let targetInfo = {};
                const targetRow = $('.targetRow').get();

                for (const target of targetRow) {
                    const targetCoord = $('.targetCoord', target).val();
                    const commandId = $(target).data('command-id');
                    await getVillageId(targetCoord, storedVillageList).then(async targetId => {
                        if (!targetId) return UI.ErrorMessage(`Village ${targetCoord} not found`);
                        let arrivalTime = convertFromDate($('.targetArrivalTime', target).val(), true);

                        if (attackType === 'Backtime') {
                            const sourceCoord = $('.sourceCoord', target)?.val()?.match(/\d{1,3}\|\d{1,3}/)?.findE(0) ?? await getVillageCoordsByCommandId(commandId);
                            await getVillageId(sourceCoord, storedVillageList).then(async sourceId => {
                                if (!sourceId) return UI.ErrorMessage(`Village ${sourceCoord} not found`);

                                const unit = $('.backtimeUnit option:selected', target).val();
                                const alreadyCalculated = $(':has(.backtimeCalculated)', target).length > 0;
                                const backtime = alreadyCalculated ? arrivalTime :
                                    new Date(Math.round(new Date(arrivalTime).getTime() + calculateTravelTime(targetCoord, sourceCoord, unit))).setMilliseconds(0);
                                $('.sourceCoord', target).val(sourceCoord);
                                $('.targetArrivalTime', target).val(formatTimes(new Date(backtime))).addClass('backtimeCalculated');

                                targetInfo[`${sourceCoord}-${sourceId}-${backtime}-${commandId}`] = '';
                            });
                        } else {
                            targetInfo[`${targetCoord}-${targetId}-${arrivalTime}-${commandId}`] = '';
                        }
                    });
                }
                targetInfo = Object.keys(targetInfo).map(el => {
                    const targetSplit = el.split('-');

                    return [targetSplit[0], Number(targetSplit[1]), Number(targetSplit[2]), Number(targetSplit[3]), Number(targetSplit[4])]
                });

                villages.map((row) => {
                    const coord = extractCoords($('.quickedit-label', row).text());
                    const villageId = $('.quickedit-vn', row).data('id');
                    let villageUnits = unitsToLoopOver.map((el, _) => {
                        const getVillageDistances = () => {
                            return targetInfo.map(targetVillageInfo => {
                                const target = targetVillageInfo[0];
                                const distance = calculateDistance(coord, target);
                                return {
                                    targetVillageCoord: target,
                                    distance: distance,
                                    travelTime: distance * unitSpeedSettings[el.unit]
                                }
                            });
                        }
                        return {
                            'source': coord,
                            'villageId': villageId,
                            'unit': el.unit,
                            'available': mobileCheck ? parseInt($(row).find(`img[src*=${el.unit}]`).closest('td').next('td').text()) : parseInt($(row).find(`td:eq(${el.index})`).text()) || 0,
                            'info': getVillageDistances()
                        }
                    }).filter(el => el.available > 0);
                    matchUnitCombinations(villageUnits, requestedUnits, unitsToLoopOverKeys, availableUnits, attackType);
                });

                targetInfo.map(async (target, i) => {
                    const [targetCoord, targetId, targetArrivalTime, targetCommandId] = target;
                    let snipesFound = 0;

                    availableUnits.filter(village => {
                        village.launchTime = calculateLaunchTime(village.source, targetCoord, village.unit, targetArrivalTime, osBoost);
                        let correctSpeed = compareUnitSpeeds(village.unit, 'snob', attackType);
                        return village.launchTime > (getServerDateTime() + (20 * 1000)) && village.source !== targetCoord && correctSpeed;
                    }).sort((a, b) => getTravelTime(a, targetCoord) < getTravelTime(b, targetCoord) ? 1 : -1)
                        .splice(0, requestedAmount).forEach((village) => {
                        snipesFound += 1;
                        const {source, villageId, unit, available, info, launchTime} = village;
                        const {targetVillageCoord, distance, travelTime} = info[i];
                        const targetUrl = createTargetUrl(villageId, targetId, targetArrivalTime, unit, template, fillUnits, targetCommandId, endTimeWarning);

                        notesArea.push(createNotesLine(source, targetVillageCoord, launchTime, unit, available, targetUrl, attackType));
                        offPackArea.push(createOffPackLine(source, targetVillageCoord, distance, unit, attackType, targetArrivalTime, travelTime, launchTime, template));
                        timerArea.push(createTimerLine(villageId, source, targetId, targetVillageCoord, unit, available, travelTime, launchTime, targetInfo, targetArrivalTime, attackType, targetUrl));
                    });

                    totalSnipesFound += snipesFound;
                    if (snipesFound < 1) {
                        calcErrors += `<li style="text-align:center">Impossible to reach ${targetCoord} in time!</li>`
                    } else if (snipesFound > 0 && snipesFound < requestedAmount) {
                        calcErrors += `<li style="text-align:center">Only found ${snipesFound} snipes out of the ${requestedAmount} asked for ${targetCoord}!</li>`
                    }
                });

                if (calcErrors.length) UI.ErrorMessage(calcErrors);
                if (targetInfo.length > 1) $(`#arrivalTimeColumn`).show();
                else $(`#arrivalTimeColumn`).hide();

                if (totalSnipesFound > 0) {
                    $('.notesOutputFormat').text(notesArea.sort((a, b) => a.match(/\d+-\d+-\d+\s+\d+:\d+:\d+/g).findE(0) < b.match(/\d+-\d+-\d+\s+\d+:\d+:\d+/g).findE(0) ? -1 : 1).join('\n'));
                    $('.offPackOutputFormat').text(offPackArea.sort((a, b) => a.split(',')[6] < b.split(',')[6] ? -1 : 0).join('\n'));
                    $('.timerOutputFormat tr:eq(1)').after(`${timerArea.sort(((a, b) => ($(a).find('.timer').data('endtime') > $(b).find('.timer').data('endtime') ? 1 : -1)))}`);

                    timerHandlers();
                    templateHandlers();
                    settings.selectedOutput !== 'timerOutputFormat' ? $(notesRow).show() : $(notesRow).hide();
                    $(`.optionsRow`).show();
                    $(`.${settings.selectedOutput}`).show();
                    $('#timerTableTitle').text(`Snipe options. (${$('.snipeRow').length} snipe options)`);
                } else {
                    $(`.everyOutput, #arrivalTimeColumn, .optionsRow`).hide();
                }
            } else {
                $(`.everyOutput, #arrivalTimeColumn, .optionsRow`).hide();
                UI.ErrorMessage('A minimal of one target required!');
            }
        }

        function resetLocalStorage() {
            getDefaultSettings();
            loadVillageData('update');
        }

        function handleOutputChange(el, notesRow) {
            $('.everyOutput').hide();
            $(`.${$(el).val()}`).show();
            $(el).attr('id') !== 'timersOutputOn' ? notesRow.show() : notesRow.hide();
        }

        async function handleNotesPush() {
            const selectedNote = $('#noteSelect').val();
            const attacksToPlan = $('.everyOutput:visible').val().split('\n');
            const loadNotesText = async (id) => {
                return twLib.get(`${baseLink}memo`).then(html => $(html).find('#message_' + id).text());
            }
            const editNote = (tab, content) => (twLib.post(`${baseLink}memo&action=edit`, {
                tab_id: tab,
                memo: content,
                h: game_data.csrf
            }));

            if (confirm('Confirming this will add the selected output under the selected note. Are you sure this is what you want?')) {
                const noteText = await loadNotesText(selectedNote);
                editNote(selectedNote, noteText + ('\n') + ('\n') + attacksToPlan.join('\n'));
            }
        }

        function setValue() {
            $('.inputChange').on('change', function () {
                const id = $(this).attr('id');

                $('.troopInputBox, #snipeOutputAmount').on('input', function () {
                    let value = $(this).val();

                    if (value.indexOf('.') === -1) {
                        $(this).val(Math.max(Math.min(value, Infinity), 1));
                    }
                });

                if ($(this).data('unit')) {
                    settings.units[$(this).data('unit')] = Number($(`#${id}`).val());
                } else {
                    settings[$(this).attr('name')] = Number($(`#${id}`).val());
                }

                settings.selectedType = $('#typeOfCommand').val();
                settings.selectedType === 'Backtime' ? $('.backtimeSpan').show() : $('.backtimeSpan').hide();
                settings.selectedOutput = $('[name=outputFormat]:checked').val();
                settings.loadAllVillages = $('#loadAllVillages').prop('checked') ? 'checked' : 'unchecked';
                settings.auto_remove = $('#autoRemoveCheckbox').prop('checked') ? 'checked' : 'unchecked';
                settings.fillUnitsCheckbox = $('#fillUnitsCheckbox').prop('checked') ? 'checked' : 'unchecked';
                settings.endTimeWarning = $('#endTimeWarning').prop('checked') ? 'checked' : 'unchecked';
                settings.groupId = $('#snipeGroupId').val();
                settings.template = parseInt($('#donutSnipeCalcTemplate').val());

                settings.fillUnitsCheckbox === 'checked' ? $('.templateSpan').hide() : $('.templateSpan').show();

                localStorage.setItem(settingsKey, JSON.stringify(settings));
            });
        }

        function pad(number, length) {
            let str = number.toString();
            while (str.length < length) {
                str = '0' + str;
            }
            return str;
        }

        // Format times to dd/mm/yyyy HH:MM:SS:sss //
        function formatTimes(d) {
            return `${pad(d.getDate(), 2)}/${pad((d.getMonth() + 1), 2)}/${d.getFullYear()} ${pad(d.getHours(), 2)}:${pad(d.getMinutes(), 2)}:${pad(d.getSeconds(), 2)}:${pad(d.getMilliseconds(), 3)}`;
        }

        // Format times to yyyy-mm-dd HH:MM:SS //
        function formatTimes1(timestamp, showMilliseconds) {
            const d = new Date(timestamp);
            let date = `${d.getFullYear()}-${pad((d.getMonth() + 1), 2)}-${pad(d.getDate(), 2)} ${pad(d.getHours(), 2)}:${pad(d.getMinutes(), 2)}:${pad(d.getSeconds(), 2)}`

            if (showMilliseconds) {
                date += '.' + pad(d.getMilliseconds(), 3);
            }
            return date;
        }


        function calculateLaunchTime(source, target, unit, landingTime, osBoost) {
            let distance = calculateDistance(source, target);
            const unitSpeed = parseFloat(unitSpeedSettings[unit]);

            // Convert minutes to milli-seconds //
            let msPerSec = 1000;
            let secsPerMin = 60;
            let msPerMin = msPerSec * secsPerMin;
            let unitTime = distance * unitSpeed * msPerMin / osBoost;

            return new Date().setTime(Math.round((landingTime - unitTime) / msPerSec) * msPerSec);
        }

        function createTargetRow(coordinates, dateAndTime, attackType, sourceCoord, commandId, foundUnit, isBacktime) {
            return `<tr>
                            <td class="targetRow" data-command-id="${commandId ?? null}">
                                <span class="backtimeSpan" style="display:${attackType === 'Backtime' && !isBacktime ? '' : 'none'}">Unit:
                                    <select class="inactive backtimeUnit">
                                        ${game_data.units.map(unit => `<option class="inactive" value="${unit}" ${foundUnit === unit ? 'selected' : ''}>${unit}</option>`)}
                                    </select>
                                </span><span class="backtimeSpan" style="display:${attackType === 'Backtime' && !isBacktime ? '' : 'none'}">Source:
                                    <input type="text" value="${sourceCoord}" class="text-input inactive sourceCoord" style="width: ${mobileCheck ? 60 : 40}px" onFocus="this.select()"/>
                                </span><span>Target:
                                    <input type="text" value="${coordinates}" class="text-input inactive targetCoord" style="width: ${mobileCheck ? 60 : 40}px" onFocus="this.select()"/>
                                </span><span>Arrival time: 
                                    <input type="text" class="text-input inactive targetArrivalTime" style="width: ${mobileCheck ? 161 : 123}px" value="${dateAndTime}"/>
                                </span><span style="display:${!isBacktime ? '' : 'none'}">
                                    <img class="removeTarget" style="vertical-align:-4px; cursor: pointer" src="/graphic/delete.png" alt="">
                                </span>
                            </td>
                        </tr>`
        }

        function createPopupHtml(osBoost, groups, targetArray, attackType, templates, notes) {
            return `<div id="snipePopupTable">
                            <table class="vis" style="width: 100%">
                                <tr>
                                    <th style="text-align:center">
                                        <span style="float: left; ">
                                            <img alt="" style="width: 30px; margin-left: 10px" src="${donutSmall}">
                                        </span><span style="vertical-align: -9px; font-size: 15px; text-align: center">Toxic Donut's Snipe Calculator 
                                            <small style="font-size: 7px;">&nbsp;version ${version}</small>
                                        </span><span style="float: right;">
                                            <img alt="" style="width: 30px; margin-right: 10px" src="${donutSmall}">
                                        </span>
                                    </th>
                                </tr><tr>
                                    <th>
                                        <h5>
                                            <small>Required values.</small>
                                        </h5>
                                    </th>
                                </tr><tr>
                                    <td>
                                        <span>${trans[local]['osBoost']}:
                                            <input type="text" id="osBoost" value="${osBoost}" name="os_boost" class="text-input inactive inputChange" style="width: ${mobileCheck ? 23 : 40}px">
                                        </span><span>Group:
                                            <select id="snipeGroupId" class="inactive inputChange" name="group_id">
                                                ${groups['result'].map((el) => `<option value="${el.group_id}" ${el.name ? '' : 'disabled'} ${el.group_id === settings.groupId ? 'selected' : ''}>${el.name ?? ''}</option>`)}
                                            </select>
                                        </span>
                                        <span>
                                            <input style="margin-left: 3px; cursor:pointer" type="button" id="addTarget" value="Add target">
                                        </span>
                                    </td>
                                </tr>
                                ${targetArray.join('\n')}
                                <tr id="snipeButtonRow">
                                    <td><input type="button" class="btn" style="width: ${mobileCheck ? 346 : 309}px" id="calculateSnipesButton" value="Go" style="margin-left: 6px"></td>
                                </tr><tr>
                                    <th>
                                        <h5>
                                            <small>Optional values.</small>
                                        </h5>
                                    </th>
                                </tr><tr id="unitInputRow">
                                    <td>${Object.keys(settings.units).map(unit => `
                                        <span>
                                            <img src="graphic/unit/unit_${unit}.png"  style="width:17px; height:auto; vertical-align: -4px" alt="">
                                            <input data-unit="${unit}" class="text-input inactive inputChange troopInputBox" type="number" style=" margin-right: 3px ;width: ${mobileCheck ? '45' : '40'}px" min="1" value="${settings.units[unit]}" id="${unit}Amount"">
                                        </span>`).join(' ')}
                                    </td>
                                </tr><tr>
                                    <td>
                                        <span>&nbsp;Max outputs:
                                            <input type="number" name="output_amount" id="snipeOutputAmount" style="width: 30px" value="${settings.output_amount}" class="text-input inactive inputChange"  onFocus="this.select()" >
                                        </span><span>&nbsp;Type:
                                            <select id="typeOfCommand" class="text-input inactive inputChange">
                                                ${Object.keys(settings.attackTypes).map(type => `<option ${attackType === settings.attackTypes[type] ? 'selected' : ''}>${settings.attackTypes[type]}</option>`)}
                                            </select>
                                        </span><span>&nbsp;Fill units
                                            <input style="vertical-align: -3px" type="checkbox" class="inputChange" id="fillUnitsCheckbox" ${settings.fillUnitsCheckbox}>
                                        </span><span class="templateSpan" style="display: ${settings.fillUnitsCheckbox === 'checked' ? 'none' : ''}">&nbsp;Template:
                                            <select id="donutSnipeCalcTemplate" class="inputChange inactive">
                                                <option value="0">no template</option>
                                                ${templates.map((el) => `<option value="${el[0]}" ${el[0] === settings.template ? 'selected' : ''}>${el[1]}</option>`)}
                                            </select>
                                        </span>
                                    </td>
                                </tr><tr>
                                    <td>
                                        <span>
                                            &nbsp;End time warning
                                            <input style="vertical-align: -3px" type="checkbox" class="inputChange" id="endTimeWarning" ${settings.endTimeWarning}>
                                        </span>
                                        ${game_data.player.villages > 1000 ? `<span>&nbsp;Load all villages<input style="vertical-align: -3px" type="checkbox" class="inputChange" id="loadAllVillages" ${settings.loadAllVillages}></span>` : ''}
                                        <span>&nbsp;Auto remove
                                            <input style="vertical-align: -3px" type="checkbox" class="inputChange" id="autoRemoveCheckbox" ${settings.auto_remove}>
                                        </span><span>
                                            <input type="button" class="btn-primary" id="resetStorage" value="Reset storage" style="cursor:pointer; margin-top: 0;">
                                        </span>
                                    </td>
                                </tr><tr class="optionsRow" style="display: none">
                                    <td colspan="2">
                                        <input style="vertical-align: -1px; margin-left: -1px" class="inputChange" id="timersOutputOn" type="radio" name="outputFormat"  value="timerOutputFormat" type="checkbox">Timers output
                                        <input style="vertical-align: -1px" class="inputChange" id="notesOutputOn" type="radio" name="outputFormat" value="notesOutputFormat" type="checkbox">Notes output
                                        <input style="vertical-align: -1px" class="inputChange" id="offpackOutputOn" type="radio" name="outputFormat" value="offPackOutputFormat" type="checkbox">Offpack output
                                    </td>
                                </tr><tr class="noteRow" style="display: none">
                                    <td>
                                        <select id="noteSelect">${notes.map(el => `<option value="${el.id}">${el.name}</option>`)}</select>
                                        <input type="button" class="btn-primary" id="pushToNotes" value="Push to notes.">
                                    </td>
                                </tr>
                            </table><table class="vis timerOutputFormat everyOutput" style="box-shadow: 2px 2px 2px darkgray; border: 2px solid #c1a264; margin-top: 5px;width:100%; display:none">
                                <tr>
                                    <th colspan="8" id="timerTableTitle"  style="text-align: center"></th>
                                </tr><tr>
                                    <th style="text-align: center">Source</th>
                                    <th style="text-align: center">Target</th>
                                    <th style="text-align: center">Slowest (Amount)</th>
                                    <th style="text-align: center">Travel time (<span style="color: darkblue">Launch timer</span>)</th>
                                    <th style="text-align: center" id="arrivalTimeColumn">Arrival time</th>
                                    <th style="text-align: center">
                                        <img src="graphic/command/attack.png" alt="">
                                        <img src="graphic/command/support.png" alt="">
                                    </th>
                                </tr>
                                <tr>
                                    <textarea class="notesOutputFormat everyOutput" cols="100" rows="25" style="width:99%; display:none" disabled></textarea>
                                </tr><tr>
                                    <textarea class="offPackOutputFormat everyOutput" cols="100" rows="25" style="width:100%; display:none" disabled></textarea>
                                </tr>
                            </table>
                        </div>`;
        }

        function targetHandlers() {
            $('#addTarget').on('click', () => {
                $('#snipeButtonRow').before($('.targetRow:last').closest('tr').clone());
                $('.removeTarget:not(:last)').hide();
            });

            $('body').on('click', '.removeTarget', function () {
                if ($('.targetRow').length > 1) $(this).closest('tr').remove();
                $('.removeTarget:last').show();
            });
        }

        function createTargetUrl(villageId, targetVillageId, targetArrivalTime, unit, template, fillUnits, targetCommandId, endTimeWarning) {
            let basicUrl = `game.php?village=${villageId}&screen=place&target=${targetVillageId}&arrivalTimestamp=${targetArrivalTime}&unit=${unit}`;

            basicUrl += `&donutTemplate=${template}`;
            basicUrl += `&fillUnitsCheckbox=${fillUnits}`;

            if (sitterId > 0) basicUrl += `&t=${playerId}`;
            if (targetCommandId) basicUrl += `&commandId=${targetCommandId}`;
            if (endTimeWarning) basicUrl += `&endTimeWarning=1`;

            return basicUrl;
        }

        function createNotesLine(source, targetVillageCoord, launchTime, unit, available, targetUrl, attackType) {
            return `${source}->${targetVillageCoord} | Send time:[b] ${formatTimes1(launchTime)} [/b][unit]${unit}[/unit] (${available}) >>> [url=${targetUrl}] ${attackType}[/url]`
        }

        function createOffPackLine(source, targetVillageCoord, distance, unit, attackType, targetArrivalTime, travelTime, launchTime, template) {
            return `${source}->${targetVillageCoord},${distance.toFixed(2)},${unit},${attackType !== 'Attack' && attackType !== 'Support' ? 'Attack' : attackType},${formatTimes1(targetArrivalTime, true)},${Format.timeSpan(60 * 1000 * travelTime, !0)},${formatTimes1(launchTime)},1,${template}`
        }

        function createTimerLine(villageId, source, targetVillageId, targetVillageCoord, unit, available, travelTime, launchTime, targetInfo, targetArrivalTime, attackType, targetUrl) {
            return `<tr class="snipeRow">
                            <td style="text-align: center"><a target="_blank" href="${baseLink}info_village&id=${villageId}">${source}</a></td>
                            <td style="text-align: center"><a target="_blank" href="${baseLink}info_village&id=${targetVillageId}">${targetVillageCoord}</a></td>
                            <td style="text-align: center"><img src="graphic/unit/unit_${unit}.png" alt=""> (${available})</td>
                            <td style="text-align: center">${Format.timeSpan(60 * 1000 * travelTime, !0)} <b>(<span class="timer" style="color: darkblue" data-endtime="${(launchTime + serverOffset) / 1000}"></span>)</b></td>
                            ${targetInfo.length > 1 ? `<td style="text-align: center">${formatTimes1(targetArrivalTime)}</td>` : ''}
                            <td style="text-align: center"><a target="_blank" style="color: ${attackType === 'Support' ? 'dodgerblue' : 'red'}" href="${targetUrl}">${attackType}</a>
                                <span>
                                    <img class="deleteRow"  style="display: none; vertical-align: -3px; cursor:pointer;" src="/graphic/delete.png" title="" alt="" class="">
                                </span>
                            </td>
                        </tr>`
        }

        function timerHandlers() {
            Timing.tickHandlers.timers.handleTimerEnd = function () {
                const removeCheckbox = $('#autoRemoveCheckbox');
                if ($(removeCheckbox).is(':checked')) {
                    $(this).closest('tr').remove();
                } else {
                    $(this).text('Almost done').css('color', 'red').closest('tr').find('.deleteRow').show();
                    $('.deleteRow').on('click', function () {
                        $(this).closest('tr').remove();
                    });
                }
                $(removeCheckbox).on('click', () => {
                    if ($('#autoRemoveCheckbox').is(':checked')) {
                        $('.deleteRow:visible').closest('tr').remove();
                    }
                });
                $('#timerTableTitle').text(`Snipe options. (${$('.snipeRow').length} snipe options)`);
            };

            $(win.TribalWars).off().on("global_tick", function () {
                document.title = 'Next snipe: ' + $('.timerOutputFormat').find('[data-endtime]:first').text();
            });
            Timing.tickHandlers.timers.init();
        }

        function templateHandlers() {
            $('#fillUnitsCheckbox').on('click', function () {
                const checked = $(this).prop('checked');

                $('.snipeRow').each((i, el) => {
                    $('td:last a', el).attr('href', $('td:last a', el).attr('href').replace(/fillUnitsCheckbox=true|fillUnitsCheckbox=false/, `fillUnitsCheckbox=${checked}`));
                });

            });

            $('#donutSnipeCalcTemplate, #typeOfCommand').change(function () {
                const templateId = parseInt($('#donutSnipeCalcTemplate').val());
                const notesOutput = $('.notesOutputFormat');
                const offPackOutput = $('.offPackOutputFormat');
                const attackType = $('#typeOfCommand').val();

                $('.snipeRow').each((i, el) => $('td:last a', el).attr('href', $('td:last a', el).attr('href').replace(/donutTemplate=\d+/, `donutTemplate=${templateId}`)));
                $(notesOutput).text($(notesOutput).text().replaceAll(/donutTemplate=\d+/g, `donutTemplate=${templateId}`));
                $(offPackOutput).text($(offPackOutput).text().split(/\r?\n/).map(el => {
                    const splitLine = el.split(',');
                    splitLine[3] = ['Attack', 'Support'].includes(attackType) ? attackType : 'Attack';
                    splitLine[8] = templateId;
                    return splitLine.join(',');
                }).join('\n'));
            });
        }

        function extractInputValues() {
            return $('#unitInputRow input').map((i, el) => el).get().reduce((el, ele) => ({
                ...el,
                [$(ele).data('unit')]: $(ele).val()
            }), {});
        }

        // Load overview in background //
        async function loadOverview(mode, group, attackType) {
            let villages = [], unitsToLoopOver;
            const getOverviewInfo = (mode, group, page) => new Promise((resolve, reject) => {
                resolve(twLib.get(`${baseLink}overview_villages&mode=${mode}&group=${group}&page=${page}&`));
            });
            const getVillages = (html, gt, firstPage) => {
                return $(`#combined_table .nowrap${gt > 0 && firstPage ? `:gt(${gt - 1})` : ''}`, html);
            }

            await getOverviewInfo(mode, group, -1).then(async (html) => {
                unitsToLoopOver = game_data.units
                    .filter((el) => !['spy', 'militia', attackType === 'Recap' ? '' : 'snob', attackType === 'Support' ? '' : 'knight'].includes(el))
                    .map((el, _) => {
                        return {
                            'unit': el,
                            'index': $(`#combined_table tr:first th img[src*=${el}]`, html).closest('th').index()
                        }
                    });

                $.merge(villages, getVillages(html));
                if (game_data.player.villages > 1000 && settings.loadAllVillages === 'checked') {
                    const pages = $('.paged-nav-item', html).parent().find('option').length ? $('.paged-nav-item', html).parent().find('option').length - 1 : $('.paged-nav-item', html).length;
                    const villagesPerPage = mobileCheck ? 10 : Number($('[name=page_size]', html).val());
                    const startingPage = Math.floor(1000 / villagesPerPage);
                    const startingVillage = 1000 - startingPage * villagesPerPage;
                    let firstPage = true;

                    for (let x = startingPage; x < pages; x++) {
                        await getOverviewInfo(mode, group, x).then((html) => {
                            $.merge(villages, getVillages(html, startingVillage, firstPage));
                        });
                        firstPage = false;
                    }
                }
            });

            return [villages, unitsToLoopOver];
        }

        function convertFromDate(twDate, timeStamp) {
            const [hour, min, sec, ms] = twDate.match(/\d+:\d+:\d+.\d+|\d+:\d+:\d+/)[0].split(':');
            let [day, month, year] = $('#serverDate').text().split('/').map(Number);
            let date;

            if (twDate.match(window.lang['57d28d1b211fddbb7a499ead5bf23079'].split(' ')[0])) {
                date = new Date(year, (month - 1), day + 1, hour, min, sec, ms ?? 0);
            } else if (twDate.match(/\d+\.\d+\.\d+|\d+\.\d+|\d+\/\d+\/\d+/)) {
                [day, month, year] = twDate.includes('om') ? twDate.split('om')[0].match(/\d+/g)
                    : twDate.match(/\d+/g);
                if (!year) year = new Date().getFullYear().toString();

                const yearPrefix = new Date().getFullYear().toString().slice(0, 2);
                const correctYear = year.length === 4 ? year : yearPrefix + year;

                date = new Date(correctYear, (month - 1), day, hour, min, sec, ms ?? 0);
            } else {
                date = new Date(year, (month - 1), day, hour, min, sec, ms ?? 0);
            }
            return timeStamp ? date.getTime() : date;
        }

        async function getVillageCoordsByCommandId(commandId) {
            return await twLib.get(`${game_data.link_base_pure}info_command&id=${commandId}&type=other`)
                .then(r => extractCoords($('#content_value .village_anchor:first', r).text()));
        }

        const convertSeconds = (sec) => {
            let title = '';
            const day = 24 * 60 * 60;
            const hour = 60 * 60;
            const minute = 60;

            const days = Math.floor(sec / day);
            const hours = Math.floor((sec - (days * day)) / hour);
            const minutes = Math.floor((sec - (days * day) - (hours * hour)) / minute);
            const seconds = Math.floor((sec - (days * day) - (hours * hour) - (minutes * minute)));
            if (days > 0) title += `${days} days, `;
            if (days > 0 || hours > 0) title += `${hours} hours, `;
            if (days > 0 || hours > 0 || minutes > 0) title += `${minutes} minutes and `;
            title += `${seconds} seconds.`;
            return title;
        }

        function calculateTravelTime(targetCoord, sourceCoord, unit) {
            const distance = calculateDistance(targetCoord, sourceCoord);
            const unitSpeed = parseFloat(unitSpeedSettings[unit]);

            return distance * unitSpeed * 60 * 1000;
        }

        function extractCoords(src) {
            let vv = src.match(/\d+\|\d+/ig);
            return (vv ? vv[vv.length - 1] : null);
        }

        function calculateDistance(to, from) {
            let target = extractCoords(to).match(/(\d+)\|(\d+)/);
            let source = extractCoords(from).match(/(\d+)\|(\d+)/);
            return Math.sqrt(Math.pow(source[1] - target[1], 2) + Math.pow(source[2] - target[2], 2));
        }

        function matchUnitCombinations(villageUnits, requestedUnits, unitsToLoopOverKeys, availableUnits, attackType) {
            const matchedUnitCombinations = villageUnits.filter(el => {
                const currentUnit = el.unit;
                const minAmount = requestedUnits[currentUnit];
                el.unitSpeed = Number(unitSpeedSettings[currentUnit]);

                if (attackType === 'Recap' && currentUnit !== 'snob') {
                    return false;
                }

                if (currentUnit === 'knight' && attackType === 'Support') {
                    return true;
                }

                if (isNaN(minAmount) || el.available < minAmount) {
                    const unitCombinations = Object.keys(unitSpeedSettings).filter(ele => {
                        const unitSpeed = Number(unitSpeedSettings[ele]);
                        return unitSpeed < el.unitSpeed && unitsToLoopOverKeys.includes(ele);
                    });

                    return unitCombinations.some(unit => {
                        const available = villageUnits.find(v => v.unit === unit)?.available ?? 0;
                        const minAmount = parseInt(requestedUnits[unit]);
                        return available >= minAmount;
                    });
                }

                return true;
            });

            const knightIndex = matchedUnitCombinations.findIndex(obj => obj.unit === "knight");
            if (knightIndex !== -1) {
                matchedUnitCombinations.unshift(matchedUnitCombinations.splice(knightIndex, 1)[0]);
            }

            const uniqueUnitSpeeds = [...new Set(matchedUnitCombinations.map(a => a.unitSpeed))];
            availableUnits.push(...uniqueUnitSpeeds.map(unitSpeed => matchedUnitCombinations.find(a => a.unitSpeed === unitSpeed)));
        }

        function compareUnitSpeeds(unit, unit1, attackType) {
            if (attackType !== 'Recap') return true;
            return unitSpeedSettings[unit] === unitSpeedSettings[unit1];
        }

        function getTravelTime(array, targetCoord) {
            return array.info.find(v => v.targetVillageCoord === targetCoord).travelTime
        }

        async function getCoordsFromCommandId(commandId) {
            return twLib.get(`${baseLink}info_command&id=${commandId}`).then((html) => {
                return extractCoords($('.village_anchor:eq(1)', html).text().trim());
            });
        }

        function checkboxActivation() {
            $('#openSnipeInterface, .startSnipeFinder').click(function () {
                startSnipeInterface();
            });
            $(document).on('click', '#openSnipeInterface, .startSnipeFinder', () => {
                startSnipeInterface();
            });
        }

        function createCheckbox(coord, arrivalDate, commandId, unit, sourceCoord) {
            if (!commandId) {
                return `<input type="checkbox" class="snipeSelectedSnipes" style="cursor: crosshair; text-align:center; transform: scale(1.2)" data-coords="${coord}" data-source="${sourceCoord}" data-arrival="${arrivalDate}" data-unit="${unit}">`;
            } else {
                return `<td style="text-align: center">
                        <input type="checkbox" class="snipeSelectedSnipes" style="cursor: crosshair; text-align:center; transform: scale(1.5)" data-coords="${coord}" data-source="${sourceCoord}" data-arrival="${arrivalDate}" data-command-id="${commandId}" data-unit="${unit}"></td>`;
            }
        }

        function createOverviewInterface() {
            const incomingTable = $('#commands_incomings');
            const index = $(`th:contains(${trans[local]['arrival']}):first`, incomingTable).index();
            const coord = game_data.village.coord;

            $(`tr:contains(${trans[local]['arrival']}) th:last`, incomingTable).after('<th style="text-align: center"><input type="button" class="btn" id="openSnipeInterface" value="Open interface"></th>');
            $('tr.command-row', incomingTable).each((i, el) => {
                const arrivalDateTime = formatTimes(convertFromDate($(`td:eq(${index})`, el).text().trim()));
                const commandId = $('td:first .icon-container span:first', el).data('command-id');
                const tag = $('td:first', el).text().trim();
                const unit = getUnitImage(tag, el);

                $('td:last', el).after(createCheckbox(coord, arrivalDateTime, commandId, unit));
            });
        }

        function createInfoVillageInterface() {
            const table = $('#commands_incomings, #commands_outgoings, #incomingsTribeMembers ');
            const coord = mobileCheck ? $(`#content_value span:contains("${win.lang['c7c60dd55c0cd4692587f5e9dc114ae9']}")`).next('span').text() : $(`.vis tr:contains("${win.lang['c7c60dd55c0cd4692587f5e9dc114ae9']}")`).find('td:eq(1)').text();

            $(`tr:contains(${trans[local]['upcoming']}), tr:contains(${trans[local]['incEnh_upcoming']}), tr:contains(${trans[local]['arrival']})`, table)
                .not(':has(input#openSnipeInterface)').find('th:last')
                .after('<th style="text-align: center"><input type="button" class="btn" id="openSnipeInterface" value="Open interface"></th>');

            $('tr.command-row:not(:has(input.snipeSelectedSnipes))', table).each((i, el) => {
                const arrivalDateTime = formatTimes(convertFromDate($(el).find('td:eq(1)').text().trim()));
                const commandId = $(el).find('td:first .icon-container span:first').data('command-id');
                const tag = $('td:first', el).text().trim();
                const unit = getUnitImage(tag, el);

                $('td:last', el).after(createCheckbox(coord, arrivalDateTime, commandId, unit));
            });

            //expose method
            win.donutLoadInfoVillage = () => createInfoVillageInterface();
        }

        function createOverviewVillagesInterface() {
            $('#incomings_table:visible tr:first th:last').after('<th style="text-align: center"><input type="button" class="btn" id="openSnipeInterface" value="Open interface"></th>');
            $('#incomings_table:visible .nowrap').each((i, el) => {
                const coord = extractCoords($('td:eq(1)', el).text().trim());
                const sourceCoord = extractCoords($('td:eq(2)', el).text().trim());
                const arrivalDateTime = formatTimes(convertFromDate($(el).closest('tr').find('td:eq(5)').get(0).firstChild.data.trim() + $(el).closest('tr').find('td:eq(5) span:first').text().trim()));
                const commandId = $('td:first .icon-container span:first', el).data('command-id');
                const tag = $('td:first', el).text().trim();
                const unit = getUnitImage(tag, el);

                $('td:last', el).after(createCheckbox(coord, arrivalDateTime, commandId, unit, sourceCoord));
            });
            $('.defPack_groupBy, .defPack_groupBy, #defPack_resetGroup, #sortQuick').on('click', () => {
                checkboxActivation();
            });
            checkboxActivation();

            win.loadSnipeButtons = () => createOverviewVillagesInterface();
        }

        function createCommandsInterface() {
            $('#commands_table tr:first th:last').after('<th><input type="button" class="btn" id="openSnipeInterface" value="Open interface"></th>');
            $("#commands_table .nowrap, .row_a, .row_b").find('td:last').each((i, el) => {
                const coord = extractCoords($(el).closest('tr').find('td:eq(0)').text().trim());
                const arrivalDateTime = formatTimes(convertFromDate($(el).closest('tr').find('td:eq(2)').text().trim()));
                const commandId = $(el).closest('tr').find('.quickedit').attr('data-id');

                $(el).after(createCheckbox(coord, arrivalDateTime, commandId));
            });

            win.loadSnipeButtons = () => createCommandsInterface();
        }

        function createMailMemoForumInterface(searchEl, table) {
            $('img[src*="/graphic/command/attack"]', table).each((i, el) => {
                const arrivalTime = $(table).text().match(dateRegex);
                const targetSpan = $(el).prevAll(`b:contains(${trans[local]['village']}):first`).next('span');

                if (targetSpan.length && arrivalTime) {
                    const coord = extractCoords(targetSpan.find('a:first').text());
                    const sourceCoord = extractCoords($(el).next('img').length ? $(el).next('img').next('.village_anchor').text() :
                        $(el).next('.village_anchor').text().trim());
                    const arrivalDateTime = formatTimes(convertFromDate(arrivalTime[i]));

                    $(el).before(createCheckbox(coord, arrivalDateTime, '', '', sourceCoord));
                }
            });
            createSniperInterfaceButton();
        }

        function createSniperInterfaceButton() {
            if ($('.snipeSelectedSnipes').length) {
                $('#ds_body').append(`<a style="position: fixed; bottom: 40px; right: ${mobileCheck ? 100 : 400}px; z-index: 99; border: none; outline: none; background-color: red;
                            color: white; cursor: pointer;  padding: 5px; border-radius: 5px; font-size: 18px"<button id="openSnipeInterface" >Open interface.</button></a>`);
            }
        }

        function getUnitImage(tag, el) {
            let unit = reservedWords[Object.keys(reservedWords).filter(ele => tag.includes(ele))] ?? '';
            if (unit) return unit;
            const unitIcon = $('[src*="/graphic/command/"]', el)?.get(1) ?? '';
            if (!unitIcon) return '';
            const href = $(unitIcon).attr('src');
            if (href.includes('return')) return '';
            return href.split('/command/')?.pop()?.split('.png')?.findE(0) ?? '';
        }

        function getDefaultSettings() {
            const defaultObj = {
                reservedWordUnits: {
                    'Edel.': 'snob',
                    'Ram': 'ram',
                    'Kata.': 'catapult',
                    'Zcav.': 'heavy',
                    'Lcav.': 'light',
                    'Verk.': 'spy',
                    'Bijl': 'axe',
                    'Zwaard': 'sword',
                    'Speer': 'spear',
                    'Boog': 'archer',
                    'Ridder': 'knight'

                },
                os_boost: 1.00,
                units: {spear: 1000, sword: 1000, axe: 3500, archer: 1000, light: 1000, marcher: 1000, heavy: 350},
                output_amount: 30,
                selectedOutput: 'timerOutputFormat',
                loadAllVillages: 'checked',
                auto_remove: 'checked',
                fillUnitsCheckbox: 'unchecked',
                endTimeWarning: 'unchecked',
                selectedType: 'Support',
                attackTypes: {
                    option_1: 'Support', option_2: 'Attack', option_3: 'Recap', option_4: 'Backtime'
                },
                groupId: '0',
                template: 0
            };

            if (!game_data.units.includes('archer')) {
                delete defaultObj.units['archer'];
                delete defaultObj.units['marcher'];
            }

            localStorage.setItem(settingsKey, JSON.stringify(defaultObj));

            return defaultObj;
        }

        function getUnitConfig() {
            let availableUnits = {};
            $.when($.get('/interface.php?func=get_unit_info')).done(function (xml) {
                $(xml).find('config').children().each((index, unit) => {
                    availableUnits[$(unit).prop('nodeName')] = Number($(unit).find('speed').text());
                });
                localStorage.setItem(unitSpeedsKey, JSON.stringify(availableUnits));
            });
            return availableUnits;
        }
    }
})();