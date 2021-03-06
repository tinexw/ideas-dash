package de.axelspringer.ideas.tools.dash.business.fabric;

import de.axelspringer.ideas.tools.dash.business.check.AbstractCheck;
import de.axelspringer.ideas.tools.dash.business.customization.Group;
import de.axelspringer.ideas.tools.dash.business.customization.Team;
import lombok.Getter;

/**
 * Check for fabric/crashlytics
 */
@Getter
public class FabricCheck extends AbstractCheck {

    private final String email;

    private final String password;

    public FabricCheck(String name, Group group, Team team, String email, String password) {
        super(name, group, team);
        this.email = email;
        this.password = password;
    }
}
