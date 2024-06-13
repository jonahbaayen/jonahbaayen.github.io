async function readVariantData() {
    try {
        let response = await fetch('./assets/data/variants/map.json');

        if (!response.ok) {
            throw new Error('Could not read variant data: ' + response.statusText);
        }

        let map_json = await response.json();

        let _variant_data = {};

        for (const [namespaced_mob, variants] of Object.entries(map_json)) {
            let namespace = namespaced_mob.split(':')[0]
            let mob = namespaced_mob.split(':')[1]
            for (const variant of variants) {
                let variant_response = await fetch(`./assets/data/variants/${namespace}/${mob}/${variant}`);
                let variant_json = await variant_response.json();

                // If we haven't read any data for this mob yet, create an empty list
                if (!(mob in _variant_data)) {
                    _variant_data[mob] = [];
                }

                // Create entry for variant, including it's ID and it's variant data (weight + modifiers)
                _variant_data[mob].push({id:`${namespace}:${variant.slice(0, -5)}`, data:variant_json});
            }
        }

        return _variant_data;
    } catch (error) {
        console.error('Error fetching or processing variant data:', error);
        return {};
    }
}

async function generateTiles() {
    for (let mob in latest_variant_data) {
        // Create category for each mob
        let category = document.createElement('div');
        category.id = mob;
        category.classList.add('category');
        category.classList.add('open');

        category.onclick = function(event) {
            if (category.classList.contains('open')) {
                category.classList.remove('open');
            } else {
                category.classList.add('open');
            }
        }

        let categoryName = document.createElement('h3');
        categoryName.innerText = mob;
        category.appendChild(categoryName);

        let categoryArrowContainer = document.createElement("span");
        categoryArrowContainer.classList.add("arrow-container");
        let categoryArrow = document.createElement("span");
        categoryArrow.classList.add("arrow");
        categoryArrowContainer.appendChild(categoryArrow);
        categoryName.appendChild(categoryArrowContainer);

        let variants = document.createElement('div');
        variants.classList.add('variants');

        Object.entries(latest_variant_data[mob]).forEach((data) => {
            let variantName = data[1].id.substring(data[1].id.indexOf(':') + 1).replace(/_/g, ' ');
            let variantID = data[1].id.substring(data[1].id.indexOf(':') + 1);

            let variantsMatchDefault = isDataEqual(mob, data[1].id);
            let weightsMatchDefault = isWeightEqual(mob, data[1].id);

            let variantEntry = document.createElement('div');
            variantEntry.id = data[1].id;
            variantEntry.classList.add('variant-tile');

            let topRow = document.createElement('div');
            topRow.classList.add('top');

            let nameText = document.createElement('p');
            nameText.classList.add('name');
            nameText.innerText = variantName;

            if ('name' in data[1].data) {
                variantID = data[1].data.name;
                nameText.innerText = variantID.replace(/_/g, ' ');

                let nameInfo = document.createElement('span');
                nameInfo.classList.add('material-symbols-outlined');
                nameInfo.classList.add('name-info');
                nameInfo.innerText = 'info';

                let nameInfoTooltip = document.createElement('span');
                nameInfoTooltip.classList.add('tooltip');
                if ('biome_tag' in data[1].data) {
                    nameInfoTooltip.innerHTML = `spawns in<br><b>${data[1].data.biome_tag.split(':')[0]}:<br>${data[1].data.biome_tag.split(':')[1]}</b>`;

                    nameInfo.appendChild(nameInfoTooltip);
                } else if ('breeding' in data[1].data) {
                    nameInfoTooltip.innerHTML = `from <b>${data[1].data.breeding.parent1.substring(data[1].id.indexOf(':') + 1).replace(/_/g, ' ')}</b><br>and <b>${data[1].data.breeding.parent2.substring(data[1].id.indexOf(':') + 1).replace(/_/g, ' ')}</b>`;

                    nameInfo.appendChild(nameInfoTooltip);
                }

                nameText.appendChild(nameInfo);
                
                if (/\s/.test(variantID.replace(/_/g, ' '))) {
                    if (variantID.length > 14) {
                        nameText.classList.add('break-name');
                    } else {
                        nameText.classList.add('shrink-name');
                    }
                }
            }

            topRow.appendChild(nameText);

            let enabledLabel = document.createElement('label');
            enabledLabel.innerText = 'Enabled';
            enabledLabel.classList.add('check-container');
            let enabledInput = document.createElement('input');
            enabledInput.type = 'checkbox';
            enabledInput.id = mob + '_' + data[1].id + '_checkbox';
            enabledInput.checked = true;
            let enabledSpan = document.createElement('span');
            enabledSpan.classList.add('checkmark');
            enabledLabel.appendChild(enabledInput);
            enabledLabel.appendChild(enabledSpan);
            topRow.appendChild(enabledLabel);

            variantEntry.appendChild(topRow);

            let imgContainer = document.createElement('div');
            imgContainer.classList.add("img-container");
            let img = document.createElement('img');

            loadVariantImage(`assets/images/variants/${mob}/${variantID}.png`, (exists) => {
                if (exists) {
                    img.src = `assets/images/variants/${mob}/${variantID}.png`;
                } else {
                    img.src = 'assets/images/variants/questionmark.png';
                }
            });

            img.alt = `${variantName} ${mob}`;
            imgContainer.appendChild(img);
            variantEntry.appendChild(imgContainer);

            let weightContainer = document.createElement('div');
            weightContainer.classList.add('weight-container');
            weightContainer.onclick = function(event) {
                event.stopPropagation();
            }

            var weightInput = document.createElement('input');
            weightInput.type = 'number';
            weightInput.min = 0;
            weightInput.max = 999;
            weightInput.step = 1;
            weightInput.value = data[1].data.weight;
            weightInput.classList.add('weight-input');
            weightInput.id = mob + '_' + data[1].id + '_weight';
            weightInput.onchange = function(event) {
                latest_variant_data[mob].find((_variant) => _variant.id === data[1].id).data.weight = weightInput.value;

                document.getElementById('categories').replaceChildren();
                generateTiles();
            }

            let weightLabel = document.createElement('label');
            weightLabel.classList.add('weight-label');
            weightLabel.innerText = 'Weight: ';
            weightLabel.setAttribute('for', weightInput.id);
            if ('nametag_override' in data[1].data) {
                weightLabel.innerText = '(Nametag Variant)';
                weightLabel.classList.add('nametag')
            }
            weightContainer.appendChild(weightLabel);
            if (!('nametag_override' in data[1].data)) {
                weightContainer.appendChild(weightInput);
            }

            if (!weightsMatchDefault && !('nametag_override' in data[1].data)) {
                let revertButton = document.createElement('span');
                revertButton.id = mob + '_' + data[1].id + '_revert_weight'
                revertButton.classList.add('material-symbols-outlined');
                revertButton.classList.add('revert');
                revertButton.innerText = 'replay';
                revertButton.onclick = function(event) {
                    if (enabledInput.checked) {
                        event.stopPropagation();
                        
                        latest_variant_data[mob].find((_variant) => _variant.id === data[1].id).data.weight = default_variant_data[mob].find((_variant) => _variant.id === data[1].id).data.weight;
                        
                        document.getElementById('categories').replaceChildren();
                        generateTiles();
                    }
                }

                weightContainer.classList.add('weight-modified');
                weightContainer.appendChild(revertButton);
            }

            variantEntry.appendChild(weightContainer);

            var modifiersButton;
            if (variantsMatchDefault) {
                let modifiersButtonContainer = document.createElement('div');
                modifiersButtonContainer.classList.add('modifiers-btn-container');
                modifiersButton = document.createElement('button');
                modifiersButton.id = mob + '_' + data[1].id + '_modifiers';
                if (Object.keys(data[1].data).length > 1) {
                    modifiersButton.innerText = 'Edit Modifiers';
                    modifiersButton.classList.add('has-modifiers');
                } else {
                    modifiersButton.innerText = 'Add Modifiers';
                }
                modifiersButton.onclick = function(event) {
                    event.stopPropagation();
    
                    openModifiersModal(mob, data[1])
                }
                modifiersButtonContainer.appendChild(modifiersButton);
                variantEntry.appendChild(modifiersButtonContainer);
            } else {
                let modified_modifiersButtonContainer = document.createElement('div');
                modified_modifiersButtonContainer.classList.add('modified');

                let modifiersButtonContainer = document.createElement('div');
                modifiersButtonContainer.classList.add('modifiers-btn-container');
                modifiersButton = document.createElement('button');
                modifiersButton.id = mob + '_' + data[1].id + '_modifiers';
                if (Object.keys(data[1].data).length > 1) {
                    modifiersButton.innerText = 'Edit Modifiers';
                    modifiersButton.classList.add('has-modifiers');
                } else {
                    modifiersButton.innerText = 'Add Modifiers';
                }
                modifiersButton.onclick = function(event) {
                    event.stopPropagation();
    
                    openModifiersModal(mob, data[1])
                }
                modifiersButtonContainer.appendChild(modifiersButton);

                let revertButton = document.createElement('span');
                revertButton.id = mob + '_' + data[1].id + '_revert_modifiers'
                revertButton.classList.add('material-symbols-outlined');
                revertButton.classList.add('revert');
                revertButton.innerText = 'replay';
                revertButton.onclick = function(event) {
                    if (enabledInput.checked) {
                        event.stopPropagation();
                        
                        let weight_temp = latest_variant_data[mob].find((_variant) => _variant.id === data[1].id).data.weight;
                        latest_variant_data[mob].find((_variant) => _variant.id === data[1].id).data = structuredClone(default_variant_data[mob].find((_variant) => _variant.id === data[1].id).data);
                        latest_variant_data[mob].find((_variant) => _variant.id === data[1].id).data.weight = weight_temp;

                        document.getElementById('categories').replaceChildren();
                        generateTiles();
                    }
                }

                modified_modifiersButtonContainer.appendChild(modifiersButtonContainer);
                modified_modifiersButtonContainer.appendChild(revertButton);

                variantEntry.appendChild(modified_modifiersButtonContainer);
            }
            

            variantEntry.onclick = function(event) {
                event.stopPropagation();

                if (enabledInput.checked) {
                    enabledInput.checked = false;
                    variantEntry.classList.add('disabled');
                    modifiersButton.disabled = true;
                    weightInput.disabled = true;
                    // TODO: blacklist
                } else {
                    enabledInput.checked = true;
                    variantEntry.classList.remove('disabled');
                    modifiersButton.disabled = false;
                    weightInput.disabled = false;
                    // TODO: blacklist
                }
            }

            variants.appendChild(variantEntry);
        });

        category.appendChild(variants);

        document.getElementById('categories').append(category);
    }
}

var default_variant_data;
var latest_variant_data;

async function main() {
    setupModalInteraction();

    let variant_data = await readVariantData();
    
    default_variant_data = structuredClone(variant_data);
    latest_variant_data = structuredClone(default_variant_data);

    generateTiles();
    document.getElementById('download-menu').classList.remove('visually-hidden');
    document.getElementById('loading-icon').hidden = true;
}

function loadVariantImage(src, callback) {
    const img = new Image();
    img.src = src;

    if (img.complete) {
        callback(true);
    } else {
        img.onload = () => {
            callback(true);
        }

        img.onerror = () => {
            callback(false);
        }
    }
}

document.getElementById('modifier-modal-close').onclick = function(event) {
    closeModifiersModal();
}

document.getElementById('modal-container').onclick = function(event) {
    closeModifiersModal();
}

document.getElementById('modifier-modal').onclick = function(event) {
    event.stopPropagation();
}

function openModifiersModal(mob, data) {
    document.getElementById('modal-container').hidden = false;
    document.getElementById('modal-container').dataset.modifying = `${mob}/${data.id}`;
    document.getElementById('modifier-modal-title').innerHTML = `<b>Modifiers - ${data.id}</b> (<span class="capitalize">${mob}</span>)`;

    // Populate modal
    if ('breeding' in data.data) {
        document.getElementById('breeding-checkbox').checked = true;
        document.getElementById('breeding-parent1').value = data.data.breeding.parent1;
        document.getElementById('breeding-parent2').value = data.data.breeding.parent2;
        document.getElementById('breeding-chance-slider').step = 1;
        document.getElementById('breeding-chance-slider').value = data.data.breeding.breeding_chance * 100;
        document.getElementById('breeding-chance-percent').value = data.data.breeding.breeding_chance * 100;
    } else {
        document.getElementById('breeding-checkbox').checked = false;
        document.getElementById('breeding-parent1').value = '';
        document.getElementById('breeding-parent2').value = '';
        document.getElementById('breeding-chance-slider').step = 10;
        document.getElementById('breeding-chance-slider').value = 100;
        document.getElementById('breeding-chance-percent').value = 100;
    }

    if ('discard_chance' in data.data) {
        document.getElementById('discard-checkbox').checked = true;
        document.getElementById('discard-chance-slider').step = 1;
        document.getElementById('discard-chance-slider').value = data.data.discard_chance * 100;
        document.getElementById('discard-chance-percent').value = data.data.discard_chance * 100;
    } else {
        document.getElementById('discard-checkbox').checked = false;
        document.getElementById('discard-chance-slider').step = 10;
        document.getElementById('discard-chance-slider').value = 0;
        document.getElementById('discard-chance-percent').value = 0;
    }

    if ('minimum_moon_size' in data.data) {
        document.getElementById('moon-checkbox').checked = true;
        document.getElementById('moon-phase-input').value = data.data.minimum_moon_size;
    } else {
        document.getElementById('moon-checkbox').checked = false;
        document.getElementById('moon-phase-input').value = 0;
    }

    if ('nametag_override' in data.data) {
        document.getElementById('nametag-checkbox').checked = true;
        document.getElementById('nametag-input').value = data.data.nametag_override;
    } else {
        document.getElementById('nametag-checkbox').checked = false;
        document.getElementById('nametag-input').value = '';
    }

    if ('name' in data.data) {
        document.getElementById('customid-checkbox').checked = true;
        document.getElementById('customid-input').value = data.data.name;
    } else {
        document.getElementById('customid-checkbox').checked = false;
        document.getElementById('customid-input').value = '';
    }

    if ('biome_tag' in data.data) {
        document.getElementById('biomes-checkbox').checked = true;
        document.getElementById('biomes-input').value = data.data.biome_tag;
    } else {
        document.getElementById('biomes-checkbox').checked = false;
        document.getElementById('biomes-input').value = '';
    }
    
    updateModalClasses();
    disableScrolling();
}

function closeModifiersModal() {
    document.getElementById('modal-container').hidden = true;

    let modifying = document.getElementById('modal-container').dataset.modifying.split('/');
    let mob = modifying[0];
    let variant = modifying[1];

    if (document.getElementById('breeding-checkbox').checked) {
        latest_variant_data[mob].find((_variant) => _variant.id === variant).data.breeding = {
            breeding_chance: document.getElementById('breeding-chance-percent').value / 100,
            parent1: document.getElementById('breeding-parent1').value,
            parent2: document.getElementById('breeding-parent2').value
        }
    } else {
        delete latest_variant_data[mob].find((_variant) => _variant.id === variant).data.breeding;
    }

    if (document.getElementById('discard-checkbox').checked) {
        latest_variant_data[mob].find((_variant) => _variant.id === variant).data.discard_chance = document.getElementById('discard-chance-percent').value / 100;
    } else {
        delete latest_variant_data[mob].find((_variant) => _variant.id === variant).data.discard_chance;
    }

    if (document.getElementById('moon-checkbox').checked) {
        latest_variant_data[mob].find((_variant) => _variant.id === variant).data.minimum_moon_size = document.getElementById('moon-phase-input').value;
    } else {
        delete latest_variant_data[mob].find((_variant) => _variant.id === variant).data.minimum_moon_size;
    }

    if (document.getElementById('nametag-checkbox').checked) {
        latest_variant_data[mob].find((_variant) => _variant.id === variant).data.nametag_override = document.getElementById('nametag-input').value;
    } else {
        delete latest_variant_data[mob].find((_variant) => _variant.id === variant).data.nametag_override;
    }

    if (document.getElementById('customid-checkbox').checked) {
        latest_variant_data[mob].find((_variant) => _variant.id === variant).data.name = document.getElementById('customid-input').value;
    } else {
        delete latest_variant_data[mob].find((_variant) => _variant.id === variant).data.name;
    }

    if (document.getElementById('biomes-checkbox').checked) {
        latest_variant_data[mob].find((_variant) => _variant.id === variant).data.biome_tag = document.getElementById('biomes-input').value;
    } else {
        delete latest_variant_data[mob].find((_variant) => _variant.id === variant).data.biome_tag;
    }

    delete document.getElementById('modal-container').dataset.modifying;

    enableScrolling();
    document.getElementById('categories').replaceChildren();
    generateTiles();
}

function disableScrolling(){
    var x= window.scrollX;
    var y= window.scrollY;
    window.onscroll = function() {
        window.scrollTo(x, y);
    };
}

function enableScrolling(){
    window.onscroll = null;
}

function setupModalInteraction() {
    document.getElementById('breeding-checkbox').onclick = function(event) {
        if (document.getElementById('breeding-checkbox').checked) {
            document.getElementById('modifier-breeding').classList.remove('disabled');
            document.getElementById('breeding-parent1').disabled = false;
            document.getElementById('breeding-parent2').disabled = false;
            document.getElementById('breeding-chance-slider').disabled = false;
            document.getElementById('breeding-chance-percent').disabled = false;
        } else {
            document.getElementById('modifier-breeding').classList.add('disabled');
            document.getElementById('breeding-parent1').disabled = true;
            document.getElementById('breeding-parent2').disabled = true;
            document.getElementById('breeding-chance-slider').disabled = true;
            document.getElementById('breeding-chance-percent').disabled = true;
        }
    }

    document.getElementById('breeding-chance-slider').oninput = function(event) {
        document.getElementById('breeding-chance-slider').step = 10;
        document.getElementById('breeding-chance-percent').value = document.getElementById('breeding-chance-slider').value;
    }
    document.getElementById('breeding-chance-percent').oninput = function(event) {
        document.getElementById('breeding-chance-slider').step = 1;
        document.getElementById('breeding-chance-slider').value = document.getElementById('breeding-chance-percent').value;
    }
    document.getElementById('breeding-chance-percent').onchange = function(event) {
        if (document.getElementById('breeding-chance-percent').value > 100) {
            document.getElementById('breeding-chance-percent').value = 100;
        } else if (document.getElementById('breeding-chance-percent').value < 0) {
            document.getElementById('breeding-chance-percent').value = 0;
        }
    }

    document.getElementById('discard-checkbox').onclick = function(event) {
        if (document.getElementById('discard-checkbox').checked) {
            document.getElementById('modifier-discard').classList.remove('disabled');
            document.getElementById('discard-chance-slider').disabled = false;
            document.getElementById('discard-chance-percent').disabled = false;
        } else {
            document.getElementById('modifier-discard').classList.add('disabled');
            document.getElementById('discard-chance-slider').disabled = true;
            document.getElementById('discard-chance-percent').disabled = true;
        }
    }

    document.getElementById('discard-chance-slider').oninput = function(event) {
        document.getElementById('discard-chance-slider').step = 10;
        document.getElementById('discard-chance-percent').value = document.getElementById('discard-chance-slider').value;
    }
    document.getElementById('discard-chance-percent').oninput = function(event) {
        document.getElementById('discard-chance-slider').step = 1;
        document.getElementById('discard-chance-slider').value = document.getElementById('discard-chance-percent').value;
    }
    document.getElementById('discard-chance-percent').onchange = function(event) {
        if (document.getElementById('discard-chance-percent').value > 100) {
            document.getElementById('discard-chance-percent').value = 100;
        } else if (document.getElementById('discard-chance-percent').value < 0) {
            document.getElementById('discard-chance-percent').value = 0;
        }
    }

    document.getElementById('moon-checkbox').onclick = function(event) {
        if (document.getElementById('moon-checkbox').checked) {
            document.getElementById('modifier-moon').classList.remove('disabled');
            document.getElementById('moon-phase-input').disabled = false;
        } else {
            document.getElementById('modifier-moon').classList.add('disabled');
            document.getElementById('moon-phase-input').disabled = true;
        }
    }

    document.getElementById('moon-phase-input').onchange = function(event) {
        if (document.getElementById('moon-phase-input').value > 1) {
            document.getElementById('moon-phase-input').value = 1;
        } else if (document.getElementById('moon-phase-input').value < 0) {
            document.getElementById('moon-phase-input').value = 0;
        }
    }

    document.getElementById('moon-phase-revert').onclick = function(event) {
        if (document.getElementById('moon-checkbox').checked) {
            let modifying = document.getElementById('modal-container').dataset.modifying.split('/');
            let mob = modifying[0];
            let variant = modifying[1];

            document.getElementById('moon-phase-input').value = default_variant_data[mob].find((_variant) => _variant.id === variant).data.minimum_moon_size
        }
    }

    document.getElementById('customid-revert').onclick = function(event) {
        if (document.getElementById('customid-checkbox').checked) {
            document.getElementById('customid-input').value = '';
        }
    }

    document.getElementById('nametag-checkbox').onclick = function(event) {
        if (document.getElementById('nametag-checkbox').checked) {
            document.getElementById('modifier-nametag').classList.remove('disabled');
            document.getElementById('nametag-input').disabled = false;
        } else {
            document.getElementById('modifier-nametag').classList.add('disabled');
            document.getElementById('nametag-input').disabled = true;
        }
    }

    document.getElementById('customid-checkbox').onclick = function(event) {
        if (document.getElementById('customid-checkbox').checked) {
            document.getElementById('modifier-customid').classList.remove('disabled');
            document.getElementById('customid-input').disabled = false;
        } else {
            document.getElementById('modifier-customid').classList.add('disabled');
            document.getElementById('customid-input').disabled = true;
        }
    }

    document.getElementById('biomes-checkbox').onclick = function(event) {
        if (document.getElementById('biomes-checkbox').checked) {
            document.getElementById('modifier-biomes').classList.remove('disabled');
            document.getElementById('biomes-input').disabled = false;
        } else {
            document.getElementById('modifier-biomes').classList.add('disabled');
            document.getElementById('biomes-input').disabled = true;
        }
    }
}

function updateModalClasses() {
    if (document.getElementById('breeding-checkbox').checked) {
        document.getElementById('modifier-breeding').classList.remove('disabled');
        document.getElementById('breeding-parent1').disabled = false;
        document.getElementById('breeding-parent2').disabled = false;
        document.getElementById('breeding-chance-slider').disabled = false;
        document.getElementById('breeding-chance-percent').disabled = false;
    } else {
        document.getElementById('modifier-breeding').classList.add('disabled');
        document.getElementById('breeding-parent1').disabled = true;
        document.getElementById('breeding-parent2').disabled = true;
        document.getElementById('breeding-chance-slider').disabled = true;
        document.getElementById('breeding-chance-percent').disabled = true;
    }

    if (document.getElementById('discard-checkbox').checked) {
        document.getElementById('modifier-discard').classList.remove('disabled');
        document.getElementById('discard-chance-slider').disabled = false;
        document.getElementById('discard-chance-percent').disabled = false;
    } else {
        document.getElementById('modifier-discard').classList.add('disabled');
        document.getElementById('discard-chance-slider').disabled = true;
        document.getElementById('discard-chance-percent').disabled = true;
    }

    if (document.getElementById('moon-checkbox').checked) {
        document.getElementById('modifier-moon').classList.remove('disabled');
        document.getElementById('moon-phase-input').disabled = false;
    } else {
        document.getElementById('modifier-moon').classList.add('disabled');
        document.getElementById('moon-phase-input').disabled = true;
    }

    if (document.getElementById('nametag-checkbox').checked) {
        document.getElementById('modifier-nametag').classList.remove('disabled');
        document.getElementById('nametag-input').disabled = false;
    } else {
        document.getElementById('modifier-nametag').classList.add('disabled');
        document.getElementById('nametag-input').disabled = true;
    }

    if (document.getElementById('customid-checkbox').checked) {
        document.getElementById('modifier-customid').classList.remove('disabled');
        document.getElementById('customid-input').disabled = false;
    } else {
        document.getElementById('modifier-customid').classList.add('disabled');
        document.getElementById('customid-input').disabled = true;
    }

    if (document.getElementById('biomes-checkbox').checked) {
        document.getElementById('modifier-biomes').classList.remove('disabled');
        document.getElementById('biomes-input').disabled = false;
    } else {
        document.getElementById('modifier-biomes').classList.add('disabled');
        document.getElementById('biomes-input').disabled = true;
    }
}

function isWeightEqual(mob, id) {
    let default_data = default_variant_data[mob].find((_variant) => _variant.id === id).data;
    let modified_data = latest_variant_data[mob].find((_variant) => _variant.id === id).data;

    return default_data.weight == modified_data.weight;
}

function isDataEqual(mob, id) {
    let default_data = default_variant_data[mob].find((_variant) => _variant.id === id).data;
    let modified_data = latest_variant_data[mob].find((_variant) => _variant.id === id).data;

    let breeding = false;
    if ('breeding' in default_data && 'breeding' in modified_data) {
        breeding = default_data.breeding.breeding_chance === modified_data.breeding.breeding_chance
            && default_data.breeding.parent1 === modified_data.breeding.parent1
            && default_data.breeding.parent2 === modified_data.breeding.parent2;
    } else if (!('breeding' in default_data) && !('breeding' in modified_data)) {
        breeding = true;
    }

    let discard = false;
    if ('discard_chance' in default_data && 'discard_chance' in modified_data) {
        discard = default_data.discard_chance === modified_data.discard_chance;
    } else if (!('discard_chance' in default_data) && !('discard_chance' in modified_data)) {
        discard = true;
    }

    let moon = false;
    if ('minimum_moon_size' in default_data && 'minimum_moon_size' in modified_data) {
        moon = default_data.minimum_moon_size == modified_data.minimum_moon_size;
    } else if (!('minimum_moon_size' in default_data) && !('minimum_moon_size' in modified_data)) {
        moon = true;
    }

    let nametag = false;
    if ('nametag_override' in default_data && 'nametag_override' in modified_data) {
        nametag = default_data.nametag_override === modified_data.nametag_override;
    } else if (!('nametag_override' in default_data) && !('nametag_override' in modified_data)) {
        nametag = true;
    }

    let customid = false;
    if ('name' in default_data && 'name' in modified_data) {
        customid = default_data.name === modified_data.name;
    } else if (!('customid' in default_data) && !('customid' in modified_data)) {
        customid = true;
    }

    let biome = false;
    if ('biome_tag' in default_data && 'biome_tag' in modified_data) {
        biome = default_data.biome_tag === modified_data.biome_tag;
    } else if (!('biome_tag' in default_data) && !('biome_tag' in modified_data)) {
        biome = true;
    }

    return breeding && discard && moon && nametag && customid && biome;
}

main();

