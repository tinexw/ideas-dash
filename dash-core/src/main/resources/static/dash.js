angular.module('dash', ['ngResource', 'ngSanitize'])
    .controller('dashcontroller', function ($scope, $resource, $interval) {

        // teams rest resource
        var configResource = $resource('rest/config');

        configResource.get().$promise.then(function (config) {
            $scope.title = config['title'];
        });

        var storage = window['localStorage'];

        // config object from/in localStorage
        $scope.config = storage && storage['config'] ? JSON.parse(storage['config']) : {team: "All Teams", aggregate: true};

        // watch changes and write to storage
        $scope.$watch("config", function (config) {
            if (storage) {
                storage['config'] = JSON.stringify(config);
            }
        }, true);

        // infos rest resource
        var infosResource = $resource('rest/infos');

        // teams rest resource
        var teamsResource = $resource('rest/teams');

        teamsResource.get().$promise.then(function (teams) {
            $scope.teams = teams['teams'];
        });

        // last update time. caused monitor to die if problems occur.
        $scope.lastUpdate = {};

        /**
         * used to aggregate green checks (better overview on monitor)
         *
         * @param group
         * @returns {*}
         */
        var aggregate = function (group) {

            // if no aggregation is requested, do nothing
            if (!$scope.config.aggregate) {
                return group;
            }

            // new array for aggregated checks
            var aggregatedChecks = [];

            // count green checks
            var greenCount = 0;

            // iterate over checks, put non-green in aggregated list, count green
            for (var i = 0; i < group.checks.length; i++) {
                var check = group.checks[i];
                var state = check.state;
                if (state == 'GREEN') {
                    greenCount++;
                } else {
                    aggregatedChecks.push(check);
                }
            }

            // put "fine"-entry in aggragated checks
            if (greenCount > 0) {
                aggregatedChecks.push({
                    name: 'F-I-N-E',
                    info: greenCount + ' Checks',
                    state: 'GREEN'
                });
            }

            // replace original checks with aggregated checks
            group.checks = aggregatedChecks;
        };

        $scope.loadInfos = function () {
            // Do not store the result of query() into the $scope directly.
            // The rest call may take some time and query() returns an empty resource immediately and updates it later.
            // This leads to flickering
            var promise = infosResource.get().$promise;
            promise.then(function (infos) {

                $scope.lastUpdate.date = new Date();

                // be-app-start-id
                var applicationStartId = infos.applicationStartId;
                // if start id has changed reload the window
                if ($scope.applicationStartId && $scope.applicationStartId != applicationStartId) {
                    window.location.reload(true);
                }
                // save start id
                $scope.applicationStartId = applicationStartId;

                // aggregate
                var aggregatedGroups = [];
                for (var i = 0; i < infos.groups.length; i++) {
                    aggregatedGroups[i] = aggregate(infos.groups[i]);
                }

                $scope.infos = infos;

                if (infos == undefined || infos.groups == undefined) {
                    $scope.lastUpdate.state = 'red';
                }

                $scope.lastUpdate.state = 'green';
            });
            promise.catch(function () {
                $scope.lastUpdate.state = 'red';
            });
        };

        // execute loadGroups every 30 seconds
        $interval($scope.loadInfos, 30 * 1000);

        // load groups initially
        $scope.loadInfos();

        var aggregateState = function (state1, state2) {
            if (scoreForState(state1) > scoreForState(state2)) {
                return state1;
            }
            return state2;
        };

        var scoreForState = function (state) {
            if (state == 'GREEN' || state == 'green') {
                return 0;
            }
            if (state == 'GREY' || state == 'grey') {
                return 1;
            }
            if (state == 'YELLOW' || state == 'yellow') {
                return 2;
            }
            if (state == 'RED' || state == 'red') {
                return 3;
            }
            return -1;
        };

        $scope.classForState = function (state) {

            if (state == 'GREEN' || state == 'green') {
                return "alert-success";
            }
            if (state == 'GREY' || state == 'grey') {
                return "alert-disabled";
            }
            if (state == 'YELLOW' || state == 'yellow') {
                return "alert-warning";
            }
            return "alert-danger";
        };

        $scope.groupClass = function (group) {

            var state = 'GREEN';
            for (var i = 0; i < group.checks.length; i++) {

                var check = group.checks[i];

                // handle check that has no defined team, belongs to team (or all if All Teams is active)
                if ($scope.config.team == "All Teams" || !check.team || check.team == "" || $scope.config.team == check.team) {
                    // aggregate state (worst of two :))
                    state = aggregateState(state, check.state);
                }
            }
            return $scope.classForState(state);
        };

        $scope.checkOrder = function (check) {

            var state = check.state;
            return 4 - scoreForState(state);
        };

        $scope.teamFilter = function (check) {

            if ($scope.config.team == "All Teams") {
                return true;
            }

            if (check.team == undefined || check.team.length < 1) {
                return true;
            }

            if (check.team == $scope.config.team) {
                return true;
            }

            return false;
        };
    }
);