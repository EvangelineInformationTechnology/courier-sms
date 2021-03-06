var fs          = require('fs'),
    path        = require('path'),
    sequelize   = require('sequelize'),
    jwt         = require('jsonwebtoken'),
    async       = require('async'),
    bcrypt      = require('bcrypt');

var log         = require('../log'),
    env         = require('../env'),
    util        = require('../util');

exports.route = function(app) {
    app.get('/api/contacts', function(req, res) {
        var Contact     = req.models.Contact;

        var userId      = req.user.id,
            limit       = parseInt(req.query.limit) || 20,
            offset      = parseInt(req.query.offset) || 0;

        Contact.findAll({
            where: {
                ownerId: userId
            },
            order: [['name', 'ASC']],
            limit: limit,
            offset: offset
        }).then(function(contacts) {
            var sanitizedContacts = contacts.map(function(contact) {
                return {
                    name: contact.name,
                    number: contact.number
                };
            });
            return res.status(200).json(sanitizedContacts);
        }).catch(function(err) {
            log.error('Could not fetch contacts:', err);
            return res.status(500).json({
                message: 'Could not fetch contacts due to an internal error'
            });
        });
    });

    app.post('/api/contacts', function(req, res) {
        var Contact = req.models.Contact;

        if (util.is.array(req.body)) {
            var userId = req.user.id;
            var sanitizedContacts = req.body
                .filter(function(contact) {
                    return util.is.string(contact.name) &&
                        contact.name.length > 0 &&
                        contact.name.length < 254 &&
                        util.is.string(contact.number) &&
                        contact.number.length > 0 &&
                        contact.number.length < 254;
                })
                .map(function(contact) {
                    return {
                        name: contact.name,
                        number: contact.number,
                        ownerId: userId
                    };
                });

            Contact.destroy({
                where: {
                    ownerId: userId
                }
            }).then(function() {
                Contact.bulkCreate(sanitizedContacts)
                    .then(function() {
                        return res.status(200).send();
                    })
                    .catch(function(err) {
                        log.error('Could not create contacts:', err);
                        return res.status(200).json({
                            message: 'Could not create contacts due to an internal server error'
                        });
                    });
            }).catch(function(err) {
                log.error('Could not create contacts:', err);
                return res.status(200).json({
                    message: 'Could not create contacts due to an internal server error'
                });
            });
        } else {
            var userId = req.user.id,
                name = req.body.name,
                number = req.body.number;

            if (!util.is.string(name) || name.length < 1 || name.length > 254) {
                return res.status(400).json({
                    message: 'The "name" field was invalid'
                });
            }
            if (!util.is.string(number) || number.length < 1 || number.length > 254) {
                return res.status(400).json({
                    message: 'The "number" field was invalid'
                });
            }
            if (number[0] !== '+') {
                number = '+1' + number;
            }

            Contact.create({
                name: name,
                number: number,
                ownerId: userId
            }).then(function(contact) {
                return res.status(200).json({
                    id: contact.id,
                    name: contact.name,
                    number: contact.number
                });
            }).catch(function(err) {
                log.error('Could not create a contact', err);
                return res.status(500).json({
                    message: 'Could not create the contact due to an internal server error'
                });
            });
        }
    });
};
