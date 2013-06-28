var Consensus;
(function (Consensus) {
    var app = angular.module("consensus", ["ngCookies", "ui.bootstrap"]);

    var PokerRoomCtrl = (function () {
        function PokerRoomCtrl($scope, $location, $cookies) {
            var _this = this;
            this.$scope = $scope;
            this.$location = $location;
            this.$cookies = $cookies;
            this._poker = $.connection.poker;
            var that = this;

            $scope.myCardValueChanged = function () {
                that.changedMyCardValue($scope.myCard.Value);
            };

            $scope.closeJoinModal = function () {
                $cookies.userEmail = $scope.me.Email;
                $cookies.userName = $scope.me.Name;
                $scope.joinModal = false;

                that.join(that.getMe());
                $scope.joinRoomModal = !$scope.joinModal && !this.getRoom();
            };

            $scope.closeJoinRoomModal = function () {
                $location.path("/rooms/" + $scope.room.Name);
                $scope.joinRoomModal = false;

                that.joinRoom(that.getRoom());
            };

            $scope.joinModalOptions = {
                backdropFade: true,
                dialogFade: true,
                keyboard: true
            };

            this._poker.client.addRoomUser = function (user) {
                return _this.addRoomUser(user);
            };
            this._poker.client.disconnectedRoomUser = function (user) {
                return _this.disconnectedRoomUser(user);
            };
            this._poker.client.cardChanged = function (card) {
                return _this.cardChanged(card);
            };

            $.connection.hub.start().done(function () {
                if (that.getMe()) {
                    that.join(that.getMe()).done(function () {
                        if (that.getRoom()) {
                            that.joinRoom(that.getRoom());
                        } else {
                            $scope.joinRoomModal = true;
                            $scope.$apply();
                        }
                    });
                } else {
                    $scope.joinModal = true;
                    $scope.$apply();
                }
            });
        }
        PokerRoomCtrl.prototype.getMyCard = function () {
            var value = this.$scope.myCard;

            if (!value) {
                var userEmail = this.$cookies.userEmail;
                var userName = this.$cookies.userName;

                if (!userEmail)
                    return null;

                value = new PokerCard();
                value.User = this.getMe();
                value.Value = "";
            }

            return value;
        };

        PokerRoomCtrl.prototype.getMe = function () {
            var value = this.$scope.me;

            if (!value) {
                var userEmail = this.$cookies.userEmail;
                var userName = this.$cookies.userName;

                if (!userEmail)
                    return null;

                value = new PokerUser();
                value.Name = userName;
                value.Email = userEmail;
            }

            return value;
        };

        PokerRoomCtrl.prototype.getRoom = function () {
            var value = this.$scope.room;

            if (!value) {
                var roomName = this.$location.path().replace("/rooms/", "");

                if (!roomName)
                    return null;

                value = new PokerRoom();
                value.Name = roomName;
            }

            return value;
        };

        PokerRoomCtrl.prototype.changedMyCardValue = function (value) {
            var that = this;
            return this._poker.server.changedCard(this.getRoom(), value);
        };

        PokerRoomCtrl.prototype.join = function (user) {
            var that = this;
            return this._poker.server.join(user).done(function (data) {
                that.$scope.me = data;
                that.$scope.$apply();
            });
        };

        PokerRoomCtrl.prototype.joinRoom = function (room) {
            var that = this;
            return this._poker.server.joinRoom(room).done(function (data) {
                that.$scope.room = data;

                var me = that.getMe();
                data.Cards.forEach(function (card) {
                    if (card.User.Email === me.Email)
                        that.$scope.myCard = card;
                });

                that.$scope.$apply();
            });
        };

        PokerRoomCtrl.prototype.addRoomUser = function (user) {
            var found = false;

            this.$scope.room.Users = this.$scope.room.Users.map(function (roomUser) {
                if (user.Email === roomUser.Email) {
                    found = true;
                    roomUser = user;
                }

                return roomUser;
            });

            if (!found)
                this.$scope.room.Users.push(user);

            this.$scope.$apply();
        };

        PokerRoomCtrl.prototype.disconnectedRoomUser = function (user) {
            var found = false;

            this.$scope.room.Users = this.$scope.room.Users.map(function (roomUser) {
                if (user.Email === roomUser.Email) {
                    found = true;
                    roomUser = user;
                }

                return roomUser;
            });

            if (!found)
                this.$scope.room.Users.push(user);

            this.$scope.$apply();
        };

        PokerRoomCtrl.prototype.cardChanged = function (card) {
            var found = false;

            this.$scope.room.Cards = this.$scope.room.Cards.map(function (roomCard) {
                if (card.User.Email === roomCard.User.Email) {
                    found = true;
                    roomCard = card;
                }

                return roomCard;
            });

            if (!found)
                this.$scope.room.Cards.push(card);

            this.$scope.$apply();
        };
        return PokerRoomCtrl;
    })();
    Consensus.PokerRoomCtrl = PokerRoomCtrl;

    var PokerUser = (function () {
        function PokerUser() {
        }
        return PokerUser;
    })();
    Consensus.PokerUser = PokerUser;

    var PokerRoom = (function () {
        function PokerRoom() {
        }
        return PokerRoom;
    })();
    Consensus.PokerRoom = PokerRoom;

    var PokerCard = (function () {
        function PokerCard() {
        }
        return PokerCard;
    })();
    Consensus.PokerCard = PokerCard;
})(Consensus || (Consensus = {}));
