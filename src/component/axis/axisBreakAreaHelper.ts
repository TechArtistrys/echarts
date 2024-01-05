/*
* Licensed to the Apache Software Foundation (ASF) under one
* or more contributor license agreements.  See the NOTICE file
* distributed with this work for additional information
* regarding copyright ownership.  The ASF licenses this file
* to you under the Apache License, Version 2.0 (the
* "License"); you may not use this file except in compliance
* with the License.  You may obtain a copy of the License at
*
*   http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing,
* software distributed under the License is distributed on an
* "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
* KIND, either express or implied.  See the License for the
* specific language governing permissions and limitations
* under the License.
*/

import * as zrUtil from 'zrender/src/core/util';
import * as graphic from '../../util/graphic';
import GridModel from '../../coord/cartesian/GridModel';
import type SingleAxisModel from '../../coord/single/AxisModel';
import type CartesianAxisModel from '../../coord/cartesian/AxisModel';
import { AxisBaseModel } from '../../coord/AxisBaseModel';
import { createOrUpdatePatternFromDecal } from '../../util/decal';
import ExtensionAPI from '../../core/ExtensionAPI';

export function rectCoordAxisBuildBreakArea(
    axisGroup: graphic.Group,
    axisModel: SingleAxisModel | CartesianAxisModel,
    gridModel: GridModel | SingleAxisModel,
    api: ExtensionAPI
) {
    const axis = axisModel.axis;

    if (axis.scale.isBlank()) {
        return;
    }

    const breakAreaModel = (axisModel as AxisBaseModel).getModel('breakArea');
    const breaks = axis.scale.getBreaks();

    if (!breaks.length) {
        return;
    }

    const gridRect = gridModel.coordinateSystem.getRect();
    const backgroundStyleModel = breakAreaModel.getModel('backgroundStyle');
    const itemStyle = backgroundStyleModel.getItemStyle();
    const decal = backgroundStyleModel.get('decal');
    if (decal) {
        const decalPattern = createOrUpdatePatternFromDecal(decal, api);
        (itemStyle as any).decal = decalPattern;
    }

    for (let i = 0; i < breaks.length; i++) {
        const brk = breaks[i];
        if (brk.isExpanded) {
            continue;
        }

        // Even if brk.gap is 0, we should also draw the breakArea because
        // border is sometimes required to be visible (as a line)
        const startCoord = axis.toGlobalCoord(axis.dataToCoord(brk.start));
        const endCoord = axis.toGlobalCoord(axis.dataToCoord(brk.end));
        console.log(brk, startCoord, endCoord)

        let x;
        let y;
        let width;
        let height;
        if (axis.isHorizontal()) {
            x = startCoord;
            y = gridRect.y;
            width = endCoord - startCoord;
            height = gridRect.height;
        }
        else {
            x = gridRect.x;
            y = startCoord;
            width = gridRect.width;
            height = endCoord - startCoord;
        }

        const el = new graphic.Rect({
            shape: {
                x,
                y,
                width,
                height
            },
            style: itemStyle,
            cursor: 'pointer' // TODO: depends on whether expandable
        });

        el.on('click', () => {
            axis.scale.expandBreak(brk.start, brk.end);
            api.dispatchAction({
                type: 'axisBreakExpand',
                breakStart: brk.start,
                breakEnd: brk.end,
            });
        })

        axisGroup.add(el);
    }
}

export function rectCoordAxisAddBreakBackground(
    axisGroup: graphic.Group,
    axisModel: SingleAxisModel | CartesianAxisModel,
    gridModel: GridModel | SingleAxisModel,
    api: ExtensionAPI
) {
    const group = rectCoordAxisBuildClipPath(axisModel, gridModel, api);

    if (!group) {
        return;
    }

    const breakAreaModel = (axisModel as AxisBaseModel).getModel('breakArea');
    const backgroundStyleModel = breakAreaModel.getModel('backgroundStyle');
    const itemStyle = backgroundStyleModel.getItemStyle();
    const decal = backgroundStyleModel.get('decal');
    if (decal) {
        const decalPattern = createOrUpdatePatternFromDecal(decal, api);
        (itemStyle as any).decal = decalPattern;
    }

    group.eachChild((el: graphic.Path) => {
        el.attr({
            style: itemStyle
        });
    });

    axisGroup.add(group);
}

export function rectCoordAxisBuildClipPath(
    axisModel: SingleAxisModel | CartesianAxisModel,
    gridModel: GridModel | SingleAxisModel,
    api: ExtensionAPI
) {
    const axis = axisModel.axis;

    if (axis.scale.isBlank()) {
        return;
    }

    const breaks = axis.scale.getBreaks();

    if (!breaks.length) {
        return;
    }

    const clipGap = 0; // TODO: customizable
    const dh = 10;
    const dv = 10;

    const gridRect = gridModel.coordinateSystem.getRect();

    const group = new graphic.Group();
    for (let i = 0; i < breaks.length; i++) {
        const brk = breaks[i];
        if (brk.isExpanded) {
            continue;
        }

        // Even if brk.gap is 0, we should also draw the breakArea because
        // border is sometimes required to be visible (as a line)
        const startCoord = axis.toGlobalCoord(axis.dataToCoord(brk.start));
        const endCoord = axis.toGlobalCoord(axis.dataToCoord(brk.end));
        console.log(brk, startCoord, endCoord)
        const dGap = 0;// clipGap - (endCoord - startCoord);

        let x;
        let y;
        let width;
        let height;
        const points = [];
        if (axis.isHorizontal()) {
            x = startCoord - dGap / 2;
            y = gridRect.y;
            width = endCoord - startCoord + dGap;
            height = gridRect.height;
        }
        else {
            x = gridRect.x;
            y = startCoord - dGap / 2;
            width = gridRect.width;
            height = endCoord - startCoord + dGap;

            // sawtooth points
            let px = x;
            for (; px <= x + width; px += dh) {
                points.push([px, y + dv / 2]);
                px += dh;
                points.push([px, y - dv / 2]);
            }
            y = endCoord;
            // y += clipGap
            px -= dh;
            points.push([px, y]);
            for (; px >= x; px -= dh) {
                points.push([px, y - dv / 2]);
                px -= dh;
                points.push([px, y + dv / 2]);
            }
            y = startCoord - dGap / 2;
            px += dh;
            points.push([px, y]);
        }

        const el: graphic.Path = new graphic.Polygon({
            shape: {
                points
            }
        });

        el.on('click', () => {
            axis.scale.expandBreak(brk.start, brk.end);
            api.dispatchAction({
                type: 'axisBreakExpand',
                breakStart: brk.start,
                breakEnd: brk.end,
            });
        })

        group.add(el);
    }

    const clipPath = new graphic.Rect({
        shape: {
            x: gridRect.x,
            y: gridRect.y,
            width: gridRect.width,
            height: gridRect.height
        },
        style: {
            fill: 'blue'
        }
    });
    group.setClipPath(clipPath);

    return group;
}