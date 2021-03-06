package de.axelspringer.ideas.tools.dash.presentation;

import de.axelspringer.ideas.tools.dash.business.check.Check;
import de.axelspringer.ideas.tools.dash.business.check.CheckProvider;
import de.axelspringer.ideas.tools.dash.business.check.CheckResult;
import de.axelspringer.ideas.tools.dash.business.check.CheckService;
import de.axelspringer.ideas.tools.dash.business.customization.Group;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@Slf4j
public class UiInfoService {

    private final String applicationStartId = UUID.randomUUID().toString();

    // begin with an empty object. checks shall only be executed by the scheduler
    private UiInfo uiInfo = new UiInfo(applicationStartId);

    @Autowired
    private List<CheckProvider> checkProviders;

    @Autowired
    private CheckService checkService;

    public UiInfo infos() {
        return uiInfo;
    }

    @Scheduled(fixedDelay = 120000)
    public void check() {

        // execute them
        List<CheckResult> checkResults = checkService.check(allChecks());

        // map checkresults to infos
        Map<Group, List<CheckResult>> checkResultsMappedToGroup = mapResultsToGroups(checkResults);

        // build uigroup-object and set field
        this.uiInfo = buildUiGroups(checkResultsMappedToGroup);
    }

    private UiInfo buildUiGroups(Map<Group, List<CheckResult>> checkResultsMappedToGroup) {

        UiInfo newUiInfo = new UiInfo(applicationStartId);

        newUiInfo.setLastUpdateTime(Long.toString(System.currentTimeMillis()));

        for (Group group : checkResultsMappedToGroup.keySet()) {

            UIGroup uiGroup = new UIGroup();
            uiGroup.setName(group.toString());
            uiGroup.setOrderScore(group.getOrderScore());

            List<CheckResult> checkResultsForGroup = checkResultsMappedToGroup.get(group);

            Integer testCount = 0;
            Integer failCount = 0;
            State state = null;
            for (CheckResult checkResult : checkResultsForGroup) {
                testCount += checkResult.getTestCount();
                failCount += checkResult.getFailCount();
                state = aggregate(state, checkResult.getState());
                uiGroup.add(checkResult);
            }
            uiGroup.setTotalCount(testCount);
            uiGroup.setFailCount(failCount);

            String info = failCount > 0 ? failCount + "/" + testCount : testCount.toString();
            uiGroup.setInfo(info);
            uiGroup.setState(state);

            newUiInfo.add(uiGroup);
        }
        return newUiInfo;
    }

    State aggregate(State state1, State state2) {

        if (state1 == null) {
            return state2;
        }

        if (state2 == null) {
            return state1;
        }

        if (state1 == State.RED || state2 == State.RED) {
            return State.RED;
        }
        if (state1 == State.YELLOW || state2 == State.YELLOW) {
            return State.YELLOW;
        }
        if (state1 == State.GREY || state2 == State.GREY) {
            return State.GREY;
        }

        if (state1 == State.GREEN || state2 == State.GREEN) {
            return State.GREEN;
        }
        return State.GREY;
    }

    private Map<Group, List<CheckResult>> mapResultsToGroups(List<CheckResult> checkResults) {

        Map<Group, List<CheckResult>> checkResultsMappedToGroup = new HashMap<>();
        for (CheckResult checkResult : checkResults) {

            Group checkGroup = checkResult.getGroup();
            if (!checkResultsMappedToGroup.containsKey(checkGroup)) {
                checkResultsMappedToGroup.put(checkGroup, new ArrayList<>());
            }
            List<CheckResult> checkResultsForGroup = checkResultsMappedToGroup.get(checkGroup);
            checkResultsForGroup.add(checkResult);
        }
        return checkResultsMappedToGroup;
    }

    private List<Check> allChecks() {

        List<Check> allChecks = new ArrayList<>();
        for (CheckProvider checkProvider : checkProviders) {
            allChecks.addAll(checkProvider.provideChecks());
        }
        return allChecks;
    }
}
