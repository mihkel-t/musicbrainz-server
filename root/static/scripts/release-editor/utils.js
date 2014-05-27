// This file is part of MusicBrainz, the open internet music database.
// Copyright (C) 2014 MetaBrainz Foundation
// Licensed under the GPL version 2, or (at your option) any later version:
// http://www.gnu.org/licenses/gpl-2.0.txt
//
// The 'base64' function contained in this file is derived from:
// http://stringencoders.googlecode.com/svn-history/r210/trunk/javascript/base64.js
// Original version Copyright (C) 2010 Nick Galbreath, and released under
// the MIT license: http://opensource.org/licenses/MIT


(function (releaseEditor) {

    var utils = releaseEditor.utils = {};
    var releaseField = ko.observable().subscribeTo("releaseField", true);


    utils.mapChild = function (parent, children, type) {
        return _.map(children || [], function (data) {
            return type(data, parent);
        });
    };


    utils.withRelease = function (read, defaultValue) {
        return MB.utility.computedWith(read, releaseField, defaultValue);
    };


    utils.debounce = function (computed, delay) {
        return computed.extend({
            rateLimit: { method: "notifyWhenChangesStop", timeout: delay || 500 }
        });
    };


    // Webservice helpers

    var specialLuceneChars = /([+\-&|!(){}[\]^"~*?:\\\/])/g;

    utils.escapeLuceneValue = function (value) {
        return String(value).replace(specialLuceneChars, "\\$1");
    };

    utils.constructLuceneField = function (values, key) {
        return key + ":(" + values.join(" OR ") + ")";
    }

    utils.constructLuceneFieldConjunction = function (params) {
        return _.map(params, utils.constructLuceneField).join(" AND ");
    };


    utils.search = function (resource, query, limit, offset) {
        var requestArgs = {
            url: "/ws/2/" + resource,
            data: {
                fmt: "json",
                query: query
            }
        };

        if (limit !== undefined) requestArgs.data.limit = limit;

        if (offset !== undefined) requestArgs.data.offset = offset;

        return MB.utility.request(requestArgs);
    };


    utils.reuseExistingMediumData = function (data) {
        // When reusing an existing medium, we don't want to keep its id or
        // its cdtocs count, since neither of those will be shared. However,
        // if we haven't loaded the tracks yet, we retain the id as originalID
        // so we can request them later.
        var newData = _.omit(data, "id", "cdtocs");

        if (data.id) newData.originalID = data.id;

        return newData;
    };


    // Converts JSON from /ws/2 into /ws/js-formatted data. Hopefully one day
    // we'll have a standard MB data format and this won't be needed.

    utils.cleanWebServiceData = function (data) {
        var clean = { gid: data.id, name: data.title };

        if (data.length) clean.length = data.length;

        if (data["sort-name"]) clean.sortName = data["sort-name"];

        if (data["artist-credit"]) {
            clean.artistCredit = _.map(data["artist-credit"], cleanArtistCreditName);
        }

        if (data.disambiguation) {
            clean.comment = data.disambiguation;
        }

        return clean;
    };

    function cleanArtistCreditName(data) {
        return {
            artist: {
                gid: data.artist.id,
                name: data.artist.name,
                sortName: data.artist["sort-name"]
            },
            name: data.name,
            joinPhrase: data.joinphrase || ""
        };
    }


    // Metadata comparison utilities.

    function lengthsAreWithin10s(a, b) {
        return Math.abs(a - b) <= MB.constants.MAX_LENGTH_DIFFERENCE;
    }

    function namesAreSimilar(a, b) {
        return MB.utility.similarity(a, b) >= MB.constants.MIN_NAME_SIMILARITY;
    }

    utils.similarNames = function (oldName, newName) {
        return oldName == newName || namesAreSimilar(oldName, newName);
    };

    utils.similarLengths = function (oldLength, newLength) {
        // If either of the lengths are empty, we can't compare them, so we
        // consider them to be "similar" for recording association purposes.
        return !oldLength || !newLength || lengthsAreWithin10s(oldLength, newLength);
    };


    utils.calculateDiscID = function (toc) {
        var sprintf = _.str.sprintf;
        var info = toc.split(/\s/);

        var temp = sprintf("%02X", parseInt(info.shift(), 10)) +
                   sprintf("%02X", parseInt(info.shift(), 10));

        for (var i = 0; i < 100; i++) {
            temp += sprintf("%08X", parseInt(info[i], 10) || 0);
        }

        return base64(rstr_sha1(temp));
    };


    // The alphabet has been modified and does not conform to RFC822.
    // For an explanation, see http://wiki.musicbrainz.org/Disc_ID_Calculation

    var padchar = "-";
    var alpha = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789._";

    function base64(s) {
        var i, b10;
        var x = [];
        var imax = s.length - s.length % 3;

        for (i = 0; i < imax; i += 3) {
            b10 = (s.charCodeAt(i) << 16) | (s.charCodeAt(i + 1) << 8) | s.charCodeAt(i + 2);
            x.push(alpha.charAt(b10 >> 18));
            x.push(alpha.charAt((b10 >> 12) & 0x3F));
            x.push(alpha.charAt((b10 >> 6) & 0x3F));
            x.push(alpha.charAt(b10 & 0x3F));
        }

        switch (s.length - imax) {
            case 1:
                b10 = s.charCodeAt(i) << 16;
                x.push(alpha.charAt(b10 >> 18) + alpha.charAt((b10 >> 12) & 0x3F) +
                       padchar + padchar);
                break;
            case 2:
                b10 = (s.charCodeAt(i) << 16) | (s.charCodeAt(i + 1) << 8);
                x.push(alpha.charAt(b10 >> 18) + alpha.charAt((b10 >> 12) & 0x3F) +
                       alpha.charAt((b10 >> 6) & 0x3F) + padchar);
                break;
        }

        return x.join("");
    }

}(MB.releaseEditor = MB.releaseEditor || {}));